sigma.tools.drawRoundRect = function(ctx, x, y, w, h, ellipse, corners) {
  var e = ellipse ? ellipse : 0;
  var c = corners ? corners : [];
  c = ((typeof c) == 'string') ? c.split(' ') : c;

  var tl = e && (c.indexOf('topleft') >= 0 ||
                 c.indexOf('top') >= 0 ||
                 c.indexOf('left') >= 0);
  var tr = e && (c.indexOf('topright') >= 0 ||
                 c.indexOf('top') >= 0 ||
                 c.indexOf('right') >= 0);
  var bl = e && (c.indexOf('bottomleft') >= 0 ||
                 c.indexOf('bottom') >= 0 ||
                 c.indexOf('left') >= 0);
  var br = e && (c.indexOf('bottomright') >= 0 ||
                 c.indexOf('bottom') >= 0 ||
                 c.indexOf('right') >= 0);

  ctx.moveTo(x, y + e);

  if (tl) {
    ctx.arcTo(x, y, x + e, y, e);
  }else {
    ctx.lineTo(x, y);
  }

  if (tr) {
    ctx.lineTo(x + w - e, y);
    ctx.arcTo(x + w, y, x + w, y + e, e);
  }else {
    ctx.lineTo(x + w, y);
  }

  if (br) {
    ctx.lineTo(x + w, y + h - e);
    ctx.arcTo(x + w, y + h, x + w - e, y + h, e);
  }else {
    ctx.lineTo(x + w, y + h);
  }

  if (bl) {
    ctx.lineTo(x + e, y + h);
    ctx.arcTo(x, y + h, x, y + h - e, e);
  }else {
    ctx.lineTo(x, y + h);
  }

  ctx.lineTo(x, y + e);
};

sigma.tools.getRGB = function(s, asArray) {
  s = s.toString();
  var res = {
    'r': 0,
    'g': 0,
    'b': 0
  };

  if (s.length >= 3) {
    if (s.charAt(0) == '#') {
      var l = s.length - 1;
      if (l == 6) {
        res = {
          'r': parseInt(s.charAt(1) + s.charAt(2), 16),
          'g': parseInt(s.charAt(3) + s.charAt(4), 16),
          'b': parseInt(s.charAt(5) + s.charAt(5), 16)
        };
      }else if (l == 3) {
        res = {
          'r': parseInt(s.charAt(1) + s.charAt(1), 16),
          'g': parseInt(s.charAt(2) + s.charAt(2), 16),
          'b': parseInt(s.charAt(3) + s.charAt(3), 16)
        };
      }
    }
  }

  if (asArray) {
    res = [
      res['r'],
      res['g'],
      res['b']
    ];
  }

  return res;
};

sigma.tools.rgbToHex = function(R, G, B) {
  return sigma.tools.toHex(R) + sigma.tools.toHex(G) + sigma.tools.toHex(B);
};

sigma.tools.toHex = function(n) {
  n = parseInt(n, 10);

  if (isNaN(n)) {
    return '00';
  }
  n = Math.max(0, Math.min(n, 255));
  return '0123456789ABCDEF'.charAt((n - n % 16) / 16) +
         '0123456789ABCDEF'.charAt(n % 16);
};

/**
  * Check if a point is on the line segment.
  * @param  {number} x  The X coordinate of the point to check.
  * @param  {number} y  The Y coordinate of the point to check.
  * @param  {number} x1 The X coordinate of the line starting point.
  * @param  {number} y1 The Y coordinate of the line starting point.
  * @param  {number} x2 The X coordinate of the line ending point.
  * @param  {number} y2 The Y coordinate of the line ending point.
  * @param  {number} w  The line thickness.
  * @param  {number} epsilon An adjustement parameter which may depend on the zoom ratio.
  * @return {Boolean} Returns true if point is on the line segment, false otherwise.
*/
sigma.tools.isOnSegment = function(x ,y, x1, y1, x2, y2, w, epsilon) {
  // see http://stackoverflow.com/questions/328107/how-can-you-determine-a-point-is-between-two-other-points-on-a-line-segment
  if (Math.min(x1, x2) < x && x < Math.max(x1, x2) && 
      Math.min(y1, y2) < y && y < Math.max(y1, y2)) {  //bounding box
    return Math.abs((y - y1) * (x2 - x1) - (x - x1) * (y2 - y1)) < w * epsilon; //crossproduct < edge thickness
  }
  return false;
};

/**
  * Compute the coordinates of the point positioned
  * at length t in the quadratic bezier curve.
  * @param  {number} t  In [0,1] the step percentage to reach 
  *                     the point in the curve from the context point.
  * @param  {number} x1 The X coordinate of the context point.
  * @param  {number} y1 The Y coordinate of the context point.
  * @param  {number} x2 The X coordinate of the ending point.
  * @param  {number} y2 The Y coordinate of the ending point.
  * @param  {number} xi The X coordinate of the control point.
  * @param  {number} yi The Y coordinate of the control point.
  * @return {Object} Returns {x,y}.
*/
sigma.tools.pointOnQuadraticCurve = function(t, x1, y1, x2, y2, xi, yi) {
  // see http://stackoverflow.com/questions/5634460/quadratic-bezier-curve-calculate-point
  // see http://www.html5canvastutorials.com/tutorials/html5-canvas-quadratic-curves/
  return {'x': Math.pow(1-t, 2) * x1 + 2 * (1-t) * t * xi + Math.pow(t, 2) * x2, 
          'y': Math.pow(1-t, 2) * y1 + 2 * (1-t) * t * yi + Math.pow(t, 2) * y2};
};

/**
  * Check if a point is on the quadratic bezier curve segment.
  * @param  {number} x  The X coordinate of the point to check.
  * @param  {number} y  The Y coordinate of the point to check.
  * @param  {number} x1 The X coordinate of the line starting point.
  * @param  {number} y1 The Y coordinate of the line starting point.
  * @param  {number} x2 The X coordinate of the line ending point.
  * @param  {number} y2 The Y coordinate of the line ending point.
  * @param  {number} xi The X coordinate of the control point.
  * @param  {number} yi The Y coordinate of the control point.
  * @param  {number} w  The line thickness.
  * @param  {number} epsilon An adjustement parameter which may depend on the zoom ratio.
  * @return {Boolean} Returns true if point is on the line segment, false otherwise.
*/
sigma.tools.isOnQuadraticCurve = function(x ,y, x1, y1, x2, y2, xi, yi, w, epsilon) {
  var dExtremities = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  if (Math.abs(x - x1) > dExtremities || Math.abs(y - y1) > dExtremities) {
    return false;
  }
  var dP1 = Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2)), //distance between the point and P1
      dP2 = Math.sqrt(Math.pow(x2 - x, 2) + Math.pow(y2 - y, 2)); //distance between the point and P2
  var _dt,
      t = 0.5,
      r = (dP1 < dP2) ? -0.1 : 0.1,
      rThreshold = 0.025,
      dThreshold = Math.log(1 + w) * epsilon / 20,
      pt = sigma.tools.pointOnQuadraticCurve(t, x1, y1, x2, y2, xi, yi), // get x(t), y(t)
      dt = Math.sqrt(Math.pow(x - pt.x, 2) + Math.pow(y - pt.y, 2)); // distance between the point and pt
 // console.log('---------------');
  while (t >= 0 && t <= 1 && 
    (dt > dThreshold) && 
    (r > rThreshold || r < -rThreshold)) {
    // console.log(t);
    _dt = dt;
    pt = sigma.tools.pointOnQuadraticCurve(t, x1, y1, x2, y2, xi, yi);
    dt = Math.sqrt(Math.pow(x - pt.x, 2) + Math.pow(y - pt.y, 2));
    if (dt > _dt) { //not the right direction
      r = -r / 2; // halfstep in the opposite direction
      t += r;
    } else if (t + r < 0 || t + r > 1) {  //oops, we've gone too far
      r = r / 2;
      dt = _dt; //revert, same player shoot again with a halfstep
    } else {
      t += r;
    }
  }
  return dt < dThreshold;
};
