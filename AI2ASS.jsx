// Generated by CoffeeScript 1.6.3
#targetengine session;
var collectionMethod, fuckThis, goButton, input, label, slider, textCtrl, value, win;

win = new Window("palette", "Export ASS", void 0, {
  resizeable: true
});

input = win.add("group");

input.orientation = "row";

label = input.add('statictext', void 0, 'Scale Factor: ');

label.graphics.font = "Comic Sans MS:12";

value = input.add('edittext {text: 1, characters: 2, justify: "center", active: true}');

value.graphics.font = "Comic Sans MS:12";

value.onChanging = function() {
  return slider.value = Number(value.text);
};

slider = input.add('slider', void 0, 1, 1, 11);

slider.onChanging = function() {
  return value.text = Math.round(slider.value);
};

textCtrl = win.add("edittext", [0, 0, 250, 80], "", {
  multiline: true
});

textCtrl.graphics.font = "Comic Sans MS:12";

textCtrl.text = "have ass will travel";

collectionMethod = win.add("dropdownlist", [0, 0, 250, 20], ["collectActiveLayer", "collectInnerShadow", "collectAllLayers", "CG_collectActiveLayer"]);

collectionMethod.graphics.font = "Comic Sans MS:12";

collectionMethod.selection = 0;

goButton = win.add("button", void 0, "Export");

goButton.graphics.font = "Comic Sans MS:12";

goButton.onClick = function() {
  var bt;
  textCtrl.active = false;
  bt = new BridgeTalk;
  bt.target = "illustrator";
  bt.body = "(" + (fuckThis.toString()) + ")({scale:" + value.text + ",method:\"" + collectionMethod.selection.text + "\"});";
  bt.onResult = function(result) {
    textCtrl.text = result.body.replace(/\\\\/g, "\\").replace(/\\n/g, "\n");
    return textCtrl.active = true;
  };
  bt.onError = function(err) {
    return alert("" + err.body + " (" + a.headers["Error-Code"] + ")");
  };
  return bt.send();
};

fuckThis = function(options) {
  var ASS_createDrawingFromPoints, ASS_cubic, ASS_fixCoords, ASS_linear, CG_createDrawingFromPoints, CG_cubic, CG_fixCoords, CG_linear, checkLinear, currLayer, doc, drawCom, handleGray, handleRGB, manageColor, methods, org, scaleFactor, zeroPad;
  app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
  doc = app.activeDocument;
  org = doc.rulerOrigin;
  currLayer = doc.activeLayer;
  scaleFactor = Math.pow(2, options.scale - 1);
  drawCom = 0;
  if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
    alert("Your colorspace needs to be RGB if you want colors.");
  }
  ASS_fixCoords = function(coordArr) {
    coordArr[0] = Math.round((coordArr[0] + org[0]) * scaleFactor);
    coordArr[1] = Math.round((doc.height - (org[1] + coordArr[1])) * scaleFactor);
    return coordArr.join(" ");
  };
  CG_fixCoords = function(coordArr) {
    coordArr[0] = Math.round((coordArr[0] + org[0]) * 100) / 100;
    coordArr[1] = Math.round((coordArr[1] + org[1]) * 100) / 100;
    return coordArr.join(", ");
  };
  checkLinear = function(currPoint, prevPoint) {
    var p1, p2;
    p1 = prevPoint.anchor[0] === prevPoint.rightDirection[0] && prevPoint.anchor[1] === prevPoint.rightDirection[1];
    p2 = currPoint.anchor[0] === currPoint.leftDirection[0] && currPoint.anchor[1] === currPoint.leftDirection[1];
    return p1 && p2;
  };
  ASS_linear = function(currPoint) {
    var drawing;
    drawing = "";
    if (drawCom !== 1) {
      drawCom = 1;
      drawing = "l ";
    }
    return drawing += "" + (ASS_fixCoords(currPoint.anchor)) + " ";
  };
  CG_linear = function(currPoint) {
    return "CGContextAddLineToPoint(ctx, " + (CG_fixCoords(currPoint.anchor)) + ");\n";
  };
  ASS_cubic = function(currPoint, prevPoint) {
    var drawing;
    drawing = "";
    if (drawCom !== 2) {
      drawCom = 2;
      drawing = "b ";
    }
    return drawing += "" + (ASS_fixCoords(prevPoint.rightDirection)) + " " + (ASS_fixCoords(currPoint.leftDirection)) + " " + (ASS_fixCoords(currPoint.anchor)) + " ";
  };
  CG_cubic = function(currPoint, prevPoint) {
    return "CGContextAddCurveToPoint(ctx, " + (CG_fixCoords(prevPoint.rightDirection)) + ", " + (CG_fixCoords(currPoint.leftDirection)) + ", " + (CG_fixCoords(currPoint.anchor)) + ");\n";
  };
  zeroPad = function(num) {
    if (num < 16) {
      return "0" + (num.toString(16));
    } else {
      return num.toString(16);
    }
  };
  handleGray = function(theColor) {
    var pct;
    pct = theColor.gray;
    pct = Math.round((100 - pct) * 255 / 100);
    return ("&H" + (zeroPad(pct)) + (zeroPad(pct)) + (zeroPad(pct)) + "&").toUpperCase();
  };
  handleRGB = function(theColor) {
    var b, g, r;
    r = Math.round(theColor.red);
    g = Math.round(theColor.green);
    b = Math.round(theColor.blue);
    return ("&H" + (zeroPad(b)) + (zeroPad(g)) + (zeroPad(r)) + "&").toUpperCase();
  };
  manageColor = function(currPath, field, ASSField) {
    var fmt;
    fmt = "";
    switch (currPath[field].typename) {
      case "RGBColor":
        fmt = handleRGB(currPath[field]);
        break;
      case "GrayColor":
        fmt = handleGray(currPath[field]);
        break;
      case "NoColor":
        switch (field) {
          case "fillColor":
            return "\\" + ASSField + "a&HFF&";
          case "strokeColor":
            return "";
        }
        break;
      default:
        return "";
    }
    return "\\" + ASSField + "c" + fmt;
  };
  ASS_createDrawingFromPoints = function(pathPoints) {
    var currPoint, drawStr, j, prevPoint, _i, _ref;
    drawStr = "";
    if (pathPoints.length > 0) {
      drawCom = 0;
      drawStr += "m " + (ASS_fixCoords(pathPoints[0].anchor)) + " ";
      for (j = _i = 1, _ref = pathPoints.length; _i < _ref; j = _i += 1) {
        currPoint = pathPoints[j];
        prevPoint = pathPoints[j - 1];
        if (checkLinear(currPoint, prevPoint)) {
          drawStr += ASS_linear(currPoint);
        } else {
          drawStr += ASS_cubic(currPoint, prevPoint);
        }
      }
      prevPoint = pathPoints[pathPoints.length - 1];
      currPoint = pathPoints[0];
      if (!checkLinear(currPoint, prevPoint)) {
        drawStr += ASS_cubic(currPoint, prevPoint);
      }
      return drawStr;
    }
    return "";
  };
  CG_createDrawingFromPoints = function(pathPoints) {
    var currPoint, drawStr, j, prevPoint, _i, _ref;
    drawStr = "";
    if (pathPoints.length > 0) {
      drawStr += "CGContextMoveToPoint(ctx, " + (CG_fixCoords(pathPoints[0].anchor)) + ");\n";
      for (j = _i = 1, _ref = pathPoints.length; _i < _ref; j = _i += 1) {
        currPoint = pathPoints[j];
        prevPoint = pathPoints[j - 1];
        if (checkLinear(currPoint, prevPoint)) {
          drawStr += CG_linear(currPoint);
        } else {
          drawStr += CG_cubic(currPoint, prevPoint);
        }
      }
      prevPoint = pathPoints[pathPoints.length - 1];
      currPoint = pathPoints[0];
      if (!checkLinear(currPoint, prevPoint)) {
        drawStr += CG_cubic(currPoint, prevPoint);
      }
      return drawStr;
    }
    return "";
  };
  methods = {
    collectActiveLayer: function() {
      var currPath, fgc, outputStr, sc, _i, _len, _ref;
      outputStr = "";
      _ref = doc.pathItems;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        currPath = _ref[_i];
        if (currPath.layer.name === currLayer.name) {
          if (!(currPath.hidden || currPath.guides || currPath.clipping)) {
            if (outputStr.length === 0) {
              fgc = manageColor(currPath, "fillColor", 1);
              sc = manageColor(currPath, "strokeColor", 3);
              outputStr += "{\\pos(0,0)" + fgc + sc + "\\p" + options.scale + "}";
            }
            outputStr += ASS_createDrawingFromPoints(currPath.pathPoints);
          }
        }
      }
      return outputStr.slice(0, -1);
    },
    CG_collectActiveLayer: function() {
      var currPath, outputStr, _i, _len, _ref;
      outputStr = "";
      _ref = doc.pathItems;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        currPath = _ref[_i];
        if (currPath.layer.name === currLayer.name) {
          outputStr += CG_createDrawingFromPoints(currPath.pathPoints);
        }
      }
      return outputStr;
    },
    collectInnerShadow: function() {
      var clipStart, currPath, glyphPaths, glyphStr, group, outerGroup, outlinePaths, outlineStr, outputStr, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1;
      outputStr = "";
      clipStart = options.scale === 1 ? "" : "" + options.scale + ",";
      _ref = currLayer.groupItems;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        outerGroup = _ref[_i];
        _ref1 = outerGroup.groupItems;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          group = _ref1[_j];
          outlinePaths = group.compoundPathItems[0].pathItems;
          outlineStr = "";
          glyphPaths = group.compoundPathItems[1].pathItems;
          glyphStr = "";
          for (_k = 0, _len2 = glyphPaths.length; _k < _len2; _k++) {
            currPath = glyphPaths[_k];
            glyphStr += ASS_createDrawingFromPoints(currPath.pathPoints);
          }
          for (_l = 0, _len3 = outlinePaths.length; _l < _len3; _l++) {
            currPath = outlinePaths[_l];
            outlineStr += ASS_createDrawingFromPoints(currPath.pathPoints);
          }
          glyphStr = glyphStr.slice(0, -1);
          outlineStr = "{\\clip(" + clipStart + glyphStr + ")\\p" + options.scale + "}" + outlineStr.slice(0, -1);
          glyphStr = "{\\p" + options.scale + "}" + glyphStr;
          outputStr += "" + glyphStr + "\n" + outlineStr + "\n";
        }
      }
      return ("{innerShadow}\n" + outputStr).slice(0, -2);
    },
    collectAllLayers: function() {
      var currPath, fgc, key, output, outputStr, overall, sc, val, _i, _len, _ref;
      output = {};
      overall = "";
      _ref = doc.pathItems;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        currPath = _ref[_i];
        if (!(currPath.hidden || currPath.guides || currPath.clipping || !currPath.layer.visible)) {
          outputStr = "";
          outputStr += ASS_createDrawingFromPoints(currPath.pathPoints);
          if (!output[currPath.layer.name]) {
            fgc = manageColor(currPath, "fillColor", 1);
            sc = manageColor(currPath, "strokeColor", 3);
            outputStr = "{\\pos(0,0)" + fgc + sc + "\\p" + options.scale + "}" + outputStr;
            output[currPath.layer.name] = outputStr;
          } else {
            output[currPath.layer.name] += outputStr;
          }
        }
      }
      for (key in output) {
        val = output[key];
        overall += "" + val.slice(0, -1) + "\n";
      }
      return ("{allLayers}\n" + overall).slice(0, -2);
    }
  };
  return methods[options.method]();
};

win.show();
