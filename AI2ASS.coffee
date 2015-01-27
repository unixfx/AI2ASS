ai2assBackend = ( options ) ->
  app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS
  pWin = new Window "palette"
  pWin.text = "Progress Occurs"
  pWin.pBar = pWin.add "progressbar", undefined, 0, 250
  pWin.pBar.preferredSize = [ 250, 10 ]
  doc = app.activeDocument
  org = doc.rulerOrigin
  currLayer = doc.activeLayer
  drawCom = 0

  output = {
    str: ""
    lastFill: ""
    lastStroke: ""
    lastLayer: ""
    append: ( toAppend ) ->
      @str += toAppend

    init: ( path ) ->
      @lastFill = manageColor path, "fillColor", 1
      @lastStroke = manageColor path, "strokeColor", 3
      @lastLayer = path.layer.name
      @lastLayerNum = path.layer.zOrderPosition

      @append @prefix( )

    split: options.split or ( path ) ->
      fillColor = manageColor path, "fillColor", 1
      strokeColor = manageColor path, "strokeColor", 3
      layerName = path.layer.name
      layerNum = path.layer.zOrderPosition

      fillChange = fillColor isnt @lastFill
      strokeChange = strokeColor isnt @lastStroke
      layerChange = layerName isnt @lastLayer

      if fillChange or strokeChange or layerChange
        @lastFill = fillColor
        @lastStroke = strokeColor
        @lastLayer = layerName
        @lastLayerNum = layerNum

        @splitClean( )
        @append "#{@suffix( )}\n#{@prefix( )}"

    appendPath: ( path ) ->
      @split( path )
      @append ASS_createDrawingFromPoints path.pathPoints

    prefix: -> "{\\an7\\pos(0,0)#{@lastStroke}#{@lastFill}\\p1}"

    suffix: -> "{\\p0}"

    splitClean: ->
      @str = @str[0..-2]

    merge: ->
      @str # cleanup everywher

  }

  switch options.wrapper
    when "clip"
      output.prefix = -> "\\clip("
      output.suffix = -> ")"
    when "iclip"
      output.prefix = -> "\\iclip("
      output.suffix = -> ")"
    when "bare"
      output.prefix = -> ""
      output.suffix = -> ""
    when "line"
      output.prefix = -> "Dialogue: #{@lastLayerNum},0:00:00.00,0:00:00.00,AI,#{@lastLayer},0,0,0,,{\\an7\\pos(0,0)#{@lastStroke}#{@lastFill}\\p1}"
      output.suffix = -> ""


  alert "Your colorspace needs to be RGB if you want colors." if doc.documentColorSpace == DocumentColorSpace.CMYK

  # For ASS, the origin is the top-left corner
  ASS_fixCoords = ( coordArr ) ->
    coordArr[0] = Math.round( (coordArr[0] + org[0])*100 )/100
    coordArr[1] = Math.round( (doc.height - (org[1] + coordArr[1]))*100 )/100
    coordArr.join " "

  checkLinear = ( currPoint, prevPoint ) ->
    p1 = (prevPoint.anchor[0] == prevPoint.rightDirection[0] && prevPoint.anchor[1] == prevPoint.rightDirection[1])
    p2 = (currPoint.anchor[0] == currPoint.leftDirection[0] && currPoint.anchor[1] == currPoint.leftDirection[1])
    (p1 && p2)

  ASS_linear = ( currPoint ) ->
    drawing = ""

    if drawCom != 1
      drawCom = 1
      drawing = "l "

    drawing += "#{ASS_fixCoords currPoint.anchor} "

  ASS_cubic = ( currPoint, prevPoint ) ->
    drawing = ""

    if drawCom != 2
      drawCom = 2
      drawing = "b "

    drawing += "#{ASS_fixCoords prevPoint.rightDirection} #{ASS_fixCoords currPoint.leftDirection} #{ASS_fixCoords currPoint.anchor} "

  zeroPad = ( num ) ->
    if num < 16
      "0#{num.toString 16}"
    else
      num.toString 16

  handleGray = ( theColor ) ->
    pct = theColor.gray
    pct = Math.round (100-pct)*255/100
    "&H#{zeroPad pct}#{zeroPad pct}#{zeroPad pct}&".toUpperCase( )

  handleRGB = ( theColor ) ->
    r = Math.round theColor.red # why am I rounding these?
    g = Math.round theColor.green
    b = Math.round theColor.blue
    "&H#{zeroPad b}#{zeroPad g}#{zeroPad r}&".toUpperCase( )

  manageColor = ( currPath, field, ASSField ) ->
    fmt = ""

    switch currPath[field].typename
      when "RGBColor"
        fmt = handleRGB currPath[field]
      when "GrayColor"
        fmt = handleGray currPath[field]
      when "NoColor"
        switch field
          when "fillColor"
            return "\\#{ASSField}a&HFF&"
          when "strokeColor"
            return ""#\\bord0"
      else
        return ""

    "\\#{ASSField}c#{fmt}"
    # "GradientColor"
    # "LabColor"
    # "PatternColor"
    # "SpotColor"

  ASS_createDrawingFromPoints = ( pathPoints ) ->
    drawStr = ""

    if pathPoints.length > 0
      drawCom = 0
      drawStr += "m #{ASS_fixCoords pathPoints[0].anchor} "

      for j in [1...pathPoints.length] by 1
        currPoint = pathPoints[j]
        prevPoint = pathPoints[j-1]

        if checkLinear currPoint, prevPoint
          drawStr += ASS_linear currPoint
        else
          drawStr += ASS_cubic currPoint, prevPoint

      prevPoint = pathPoints[pathPoints.length-1]
      currPoint = pathPoints[0]

      unless checkLinear currPoint, prevPoint
        drawStr += ASS_cubic currPoint, prevPoint

      return drawStr

    return ""

  allThePaths = []
  recursePageItem = ( pageItem ) ->
    unless pageItem.hidden
      switch pageItem.typename

        when "CompoundPathItem"
          for path in pageItem.pathItems
            recursePageItem path

        when "GroupItem"
          for subPageItem in pageItem.pageItems
            recursePageItem subPageItem

        when "PathItem"
          unless pageItem.guides or pageItem.clipping or not (pageItem.stroked or pageItem.filled) or not pageItem.layer.visible
            allThePaths.push pageItem

  methods = {
    common: ->

      pWin.show( )

      output.init( allThePaths[0] )

      for path, i in allThePaths
        output.appendPath path
        pWin.pBar.value = Math.ceil i*250/(allThePaths.length-1)
        pWin.update( )

      output.splitClean( )
      output.append output.suffix( )
      pWin.close( )
      allThePaths = []
      output.merge( )

    collectActiveLayer: ->

      # PAGEITEMS DOES NOT INCLUDE SUBLAYERS, AND AS FAR AS I CAN TELL,
      # THERE'S NO WAY TO POSSIBLY TELL FROM JS WHAT ORDER SUBLAYERS ARE
      # IN RELATIVE TO THE PATHS, COMPOUND PATHS, AND GROUPS WITHIN THE
      # LAYER, WHICH MEANS IT IS IMPOSSIBLE TO REPRODUCE THE WAY
      # SUBLAYERS ARE LAYERED. TL;DR IF YOU STICK A LAYER INSIDE ANOTHER
      # LAYER, FUCK YOU FOREVER.
      unless currLayer.visible
        return "Not doing anything to that invisible layer."

      for pageItem in currLayer.pageItems
        recursePageItem pageItem

      @common( )
    collectInnerShadow: ->
      outputStr = ""

      if currLayer.groupItems.length is 0
        return "Layer formatting not as expected."

      for outerGroup in currLayer.groupItems
        if outerGroup.groupItems.length is 0
          return "Layer formatting not as expected."

        for group in outerGroup.groupItems
          if group.compoundPathItems.length is 0
            return "Layer formatting not as expected."

          outlinePaths = group.compoundPathItems[0].pathItems
          outlineStr = ""
          glyphPaths = group.compoundPathItems[1].pathItems
          glyphStr = ""

          for currPath in glyphPaths
            glyphStr += ASS_createDrawingFromPoints currPath.pathPoints

          for currPath in outlinePaths
            outlineStr += ASS_createDrawingFromPoints currPath.pathPoints

          glyphStr = glyphStr[0...-1]
          outlineStr = "{\\clip(#{glyphStr})\\p1}#{outlineStr[0...-1]}"
          glyphStr = "{\\p1}#{glyphStr}"
          outputStr += "#{glyphStr}\n#{outlineStr}\n"

      "{innerShadow}\n#{outputStr}"[0...-2]

    collectAllLayers: ->

      for layer in doc.layers
        for pageItem in layer.pageItems
          recursePageItem pageItem

      @common( )

    giveMeASeizure: ->
      output.merge = ->
        @append "\n"

      pWin.label = pWin.add "statictext", undefined, ""

      for layer in doc.layers
        currLayer = layer
        pWin.label.text = "Layer: #{currLayer.name}"

        if currLayer.pageItems.length isnt 0 and currLayer.visible
          @collectActiveLayer( )
        else if currLayer.pageItems.length is 0
          output.append "\n"

      output.str
  }

  methods[options.method]( )
