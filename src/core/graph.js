/**
 * The graph data model used in sigma.js.
 * @constructor
 * @extends sigma.classes.Cascade
 * @extends sigma.classes.EventDispatcher
 * @this {Graph}
 */
function Graph() {
  sigma.classes.Cascade.call(this);
  sigma.classes.EventDispatcher.call(this);

  /**
   * Represents "this", without the well-known scope issue.
   * @private
   * @type {Graph}
   */
  var self = this;

  /**
   * The different parameters that determine how the nodes and edges should be
   * translated and rescaled.
   * @type {Object}
   */
  this.p = {
    minNodeSize: 0,
    maxNodeSize: 0,
    minEdgeSize: 0,
    maxEdgeSize: 0,
    //   Scaling mode:
    //   - 'inside' (default)
    //   - 'outside'
    scalingMode: 'inside',
    nodesPowRatio: 0.5,
    edgesPowRatio: 0
  };

  /**
   * Contains the borders of the graph. These are useful to avoid the user to
   * drag the graph out of the canvas.
   * @type {Object}
   */
  this.borders = {};

  /**
   * Inserts a node in the graph.
   * @param {string} id     The node's ID.
   * @param {object} params An object containing the different parameters
   *                        of the node.
   * @return {Graph} Returns itself.
   */
  function addNode(id, params) {
    if (self.nodesIndex[id]) {
      throw new Error('Node "' + id + '" already exists.');
    }

    params = params || {};
    var n = {
      // Numbers :
      'x': 0,
      'y': 0,
      'size': 1,
      'degree': 0,
      'inDegree': 0,
      'outDegree': 0,
      // Flags :
      'fixed': false,
      'active': false,
      'hidden': false,
      'forceLabel': false,
      // Strings :
      'label': id.toString(),
      'id': id.toString(),
      // Custom attributes :
      'attr': {}
    };

    for (var k in params) {
      switch (k) {
        case 'id':
          break;
        case 'x':
        case 'y':
        case 'size':
          n[k] = +params[k];
          break;
        case 'fixed':
        case 'active':
        case 'hidden':
        case 'forceLabel':
          n[k] = !!params[k];
          break;
        case 'color':
        case 'label':
          n[k] = params[k];
          break;
        default:
          n['attr'][k] = params[k];
      }
    }

    self.nodes.push(n);
    self.nodesIndex[id.toString()] = n;

    return self;
  };

  /**
   * Generates the clone of a node, to make it easier to be exported.
   * @private
   * @param  {Object} node The node to clone.
   * @return {Object} The clone of the node.
   */
  function cloneNode(node) {
    return {
      'x': node['x'],
      'y': node['y'],
      'size': node['size'],
      'degree': node['degree'],
      'inDegree': node['inDegree'],
      'outDegree': node['outDegree'],
      'displayX': node['displayX'],
      'displayY': node['displayY'],
      'displaySize': node['displaySize'],
      'label': node['label'],
      'id': node['id'],
      'color': node['color'],
      'fixed': node['fixed'],
      'active': node['active'],
      'hidden': node['hidden'],
      'forceLabel': node['forceLabel'],
      'attr': node['attr']
    };
  };

  /**
   * Checks the clone of a node, and inserts its values when possible. For
   * example, it is possible to modify the size or the color of a node, but it
   * is not possible to modify its display values or its id.
   * @private
   * @param  {Object} node The original node.
   * @param  {Object} copy The clone.
   * @return {Graph} Returns itself.
   */
  function checkNode(node, copy) {
    for (var k in copy) {
      switch (k) {
        case 'id':
        case 'attr':
        case 'degree':
        case 'inDegree':
        case 'outDegree':
        case 'displayX':
        case 'displayY':
        case 'displaySize':
          break;
        case 'x':
        case 'y':
        case 'size':
          node[k] = +copy[k];
          break;
        case 'fixed':
        case 'active':
        case 'hidden':
        case 'forceLabel':
          node[k] = !!copy[k];
          break;
        case 'color':
        case 'label':
          node[k] = (copy[k] || '').toString();
          break;
        default:
          node['attr'][k] = copy[k];
      }
    }

    return self;
  };

  /**
   * Deletes one or several nodes from the graph, and the related edges.
   * @param  {(string|Array.<string>)} v A string ID, or an Array of several
   *                                     IDs.
   * @return {Graph} Returns itself.
   */
  function dropNode(v) {
    var a = (v instanceof Array ? v : [v]) || [];

    a.forEach(function(id) {
      if (self.nodesIndex[id]) {
        var index = null;
        self.nodes.some(function(n, i) {
          if (n['id'] == id) {
            index = i;
            return true;
          }
          return false;
        });

        index != null && self.nodes.splice(index, 1);
        delete self.nodesIndex[id];
      }else {
        sigma.log('Node "' + id + '" does not exist.');
      }
    });

    /**
     * Removed this from the above foreach so it doesn't have to loop over all 
     * edges every iteration. Large performance boost on very large graphs
     */
    self.edges = self.edges.filter(function(e) {
      if (a.indexOf(e['source']['id']) != -1) {
        delete self.edgesIndex[e['id']];
        e['target']['degree']--;
        e['target']['inDegree']--;
        return false;
      }else if (a.indexOf(e['target']['id']) != -1) {
        delete self.edgesIndex[e['id']];
        e['source']['degree']--;
        e['source']['outDegree']--;
        return false;
      }
      return true;
    }); 
    return self;
  };

  /**
   * Inserts an edge in the graph.
   * @param {string} id     The edge ID.
   * @param {string} source The ID of the edge source.
   * @param {string} target The ID of the edge target.
   * @param {object} params An object containing the different parameters
   *                        of the edge.
   * @return {Graph} Returns itself.
   */
  function addEdge(id, source, target, params) {
    if (self.edgesIndex[id]) {
      throw new Error('Edge "' + id + '" already exists.');
    }

    if (!self.nodesIndex[source]) {
      var s = 'Edge\'s source "' + source + '" does not exist yet.';
      throw new Error(s);
    }

    if (!self.nodesIndex[target]) {
      var s = 'Edge\'s target "' + target + '" does not exist yet.';
      throw new Error(s);
    }

    params = params || {};
    var e = {
      'source': self.nodesIndex[source],
      'target': self.nodesIndex[target],
      'size': 1,
      'weight': 1,
      'displaySize': 0.5,
      'label': id.toString(),
      'id': id.toString(),
      'hidden': false,
      'attr': {}
    };

    e['source']['degree']++;
    e['source']['outDegree']++;
    e['target']['degree']++;
    e['target']['inDegree']++;

    for (var k in params) {
      switch (k) {
        case 'id':
        case 'source':
        case 'target':
          break;
        case 'hidden':
          e[k] = !!params[k];
          break;
        case 'size':
        case 'weight':
          e[k] = +params[k];
          break;
        case 'color':
          e[k] = params[k].toString();
          break;
        case 'type':
          e[k] = params[k].toString();
          break;
        case 'label':
          e[k] = params[k];
          break;
        case 'attributes':
          for(j in params[k]) {
            e['attr'][params[k][j].attr] = params[k][j].val;
          }
          break;
        default:
          e['attr'][k] = params[k];
      }
    }

    self.edges.push(e);
    self.edgesIndex[id.toString()] = e;

    return self;
  };

  /**
   * Generates the clone of a edge, to make it easier to be exported.
   * @private
   * @param  {Object} edge The edge to clone.
   * @return {Object} The clone of the edge.
   */
  function cloneEdge(edge) {
    return {
      'source': edge['source']['id'],
      'target': edge['target']['id'],
      'size': edge['size'],
      'type': edge['type'],
      'weight': edge['weight'],
      'displaySize': edge['displaySize'],
      'label': edge['label'],
      'hidden': edge['hidden'],
      'id': edge['id'],
      'attr': edge['attr'],
      'color': edge['color']
    };
  };

  /**
   * Checks the clone of an edge, and inserts its values when possible. For
   * example, it is possible to modify the label or the type of an edge, but it
   * is not possible to modify its display values or its id.
   * @private
   * @param  {Object} edge The original edge.
   * @param  {Object} copy The clone.
   * @return {Graph} Returns itself.
   */
  function checkEdge(edge, copy) {
    for (var k in copy) {
      switch (k) {
        case 'id':
        case 'displaySize':
          break;
        case 'weight':
        case 'size':
          edge[k] = +copy[k];
          break;
        case 'source':
        case 'target':
          edge[k] = self.nodesIndex[k] || edge[k];
          break;
        case 'hidden':
          edge[k] = !!copy[k];
          break;
        case 'color':
        case 'label':
        case 'type':
          edge[k] = (copy[k] || '').toString();
          break;
        default:
          edge[k] = copy[k];
      }
    }

    return self;
  };

  /**
   * Deletes one or several edges from the graph.
   * @param  {(string|Array.<string>)} v A string ID, or an Array of several
   *                                     IDs.
   * @return {Graph} Returns itself.
   */
  function dropEdge(v) {
    var a = (v instanceof Array ? v : [v]) || [];

    a.forEach(function(id) {
      if (self.edgesIndex[id]) {
        self.edgesIndex[id]['source']['degree']--;
        self.edgesIndex[id]['source']['outDegree']--;
        self.edgesIndex[id]['target']['degree']--;
        self.edgesIndex[id]['target']['inDegree']--;

        var index = null;
        self.edges.some(function(n, i) {
          if (n['id'] == id) {
            index = i;
            return true;
          }
          return false;
        });

        index != null && self.edges.splice(index, 1);
        delete self.edgesIndex[id];
      }else {
        sigma.log('Edge "' + id + '" does not exist.');
      }
    });

    return self;
  };

  /**
   * Deletes every nodes and edges from the graph.
   * @return {Graph} Returns itself.
   */
  function empty() {
    self.nodes = [];
    self.nodesIndex = {};
    self.edges = [];
    self.edgesIndex = {};

    return self;
  };

  /**
   * Computes the display x, y and size of each node, relatively to the
   * original values and the borders determined in the parameters, such as
   * each node is in the described area.
   * @param  {number} w           The area width (actually the width of the DOM
   *                              root).
   * @param  {number} h           The area height (actually the height of the
   *                              DOM root).
   * @param  {boolean} parseNodes Indicates if the nodes have to be parsed.
   * @param  {boolean} parseEdges Indicates if the edges have to be parsed.
   * @return {Graph} Returns itself.
   */
  function rescale(w, h, parseNodes, parseEdges) {
    var weightMax = 0, sizeMax = 0;

    parseNodes && self.nodes.forEach(function(node) {
      sizeMax = Math.max(node['size'], sizeMax);
    });

    parseEdges && self.edges.forEach(function(edge) {
      weightMax = Math.max(edge['size'], weightMax);
    });

    sizeMax = sizeMax || 1;
    weightMax = weightMax || 1;

    // Recenter the nodes:
    // var xMin, xMax, yMin, yMax;
    // parseNodes && self.nodes.forEach(function(node) {
    //   xMax = Math.max(node['x'], xMax || node['x']);
    //   xMin = Math.min(node['x'], xMin || node['x']);
    //   yMax = Math.max(node['y'], yMax || node['y']);
    //   yMin = Math.min(node['y'], yMin || node['y']);
    // });

    // First, we compute the scaling ratio, without considering the sizes
    // of the nodes : Each node will have its center in the canvas, but might
    // be partially out of it.
    // var scale = self.p.scalingMode == 'outside' ?
    //             Math.max(w / Math.max(xMax - xMin, 1),
    //                      h / Math.max(yMax - yMin, 1)) :
    //             Math.min(w / Math.max(xMax - xMin, 1),
    //                      h / Math.max(yMax - yMin, 1));

    // Then, we correct that scaling ratio considering a margin, which is
    // basically the size of the biggest node.
    // This has to be done as a correction since to compare the size of the
    // biggest node to the X and Y values, we have to first get an
    // approximation of the scaling ratio.
    // var margin = (self.p.maxNodeSize || sizeMax) / scale;
    // xMax += margin;
    // xMin -= margin;
    // yMax += margin;
    // yMin -= margin;

    // scale = self.p.scalingMode == 'outside' ?
    //         Math.max(w / Math.max(xMax - xMin, 1),
    //                  h / Math.max(yMax - yMin, 1)) :
    //         Math.min(w / Math.max(xMax - xMin, 1),
    //                  h / Math.max(yMax - yMin, 1));

    // Size homothetic parameters:
    var a, b;
    if (!self.p.maxNodeSize && !self.p.minNodeSize) {
      a = 1;
      b = 0;
    }else if (self.p.maxNodeSize == self.p.minNodeSize) {
      a = 0;
      b = self.p.maxNodeSize;
    }else {
      a = (self.p.maxNodeSize - self.p.minNodeSize) / sizeMax;
      b = self.p.minNodeSize;
    }

    var c, d;
    if (!self.p.maxEdgeSize && !self.p.minEdgeSize) {
      c = 1;
      d = 0;
    }else if (self.p.maxEdgeSize == self.p.minEdgeSize) {
      c = 0;
      d = self.p.minEdgeSize;
    }else {
      c = (self.p.maxEdgeSize - self.p.minEdgeSize) / weightMax;
      d = self.p.minEdgeSize;
    }

    // Rescale the nodes:
    parseNodes && self.nodes.forEach(function(node) {
      node['displaySize'] = Math.sqrt((node['size'] * a + b) / Math.PI);

      if (!node['fixed']) {
        node['displayX'] = node['x'];
        node['displayY'] = node['y'];
        // node['displayX'] = (node['x'] - (xMax + xMin) / 2) * scale + w / 2;
        // node['displayY'] = (node['y'] - (yMax + yMin) / 2) * scale + h / 2;
      }
    });

    parseEdges && self.edges.forEach(function(edge) {
      edge['displaySize'] = edge['size'] * c + d;
    });

    return self;
  };

  /**
   * Translates the display values of the nodes and edges relatively to the
   * scene position and zoom ratio.
   * @param  {number} sceneX      The x position of the scene.
   * @param  {number} sceneY      The y position of the scene.
   * @param  {number} ratio       The zoom ratio of the scene.
   * @param  {boolean} parseNodes Indicates if the nodes have to be parsed.
   * @param  {boolean} parseEdges Indicates if the edges have to be parsed.
   * @return {Graph} Returns itself.
   */
  function translate(sceneX, sceneY, ratio, parseNodes, parseEdges) {
    var sizeRatio = Math.pow(ratio, self.p.nodesPowRatio);
    parseNodes && self.nodes.forEach(function(node) {
      if (!node['fixed']) {
        node['displayX'] = node['displayX'] * ratio + sceneX;
        node['displayY'] = node['displayY'] * ratio + sceneY;
      }

      node['displaySize'] = node['displaySize'] * sizeRatio;
    });

    sizeRatio = Math.pow(ratio, self.p.edgesPowRatio);
    parseEdges && self.edges.forEach(function(edge) {
      edge['displaySize'] = edge['displaySize'] * sizeRatio;
    });

    return self;
  };


  /**
  * Translate the x and y coordinates of the given nodes.
  * @param  {(Array.<string>)} nodeids An Array of several node IDs
  * @param  {number} dX     The x translation of the nodes.
  * @param  {number} dY     The y translation of the nodes.
  * @param  {number} sceneX The x position of the scene.
  * @param  {number} sceneY The y position of the scene.
  * @param  {number} ratio  The zoom ratio of the scene.
  * @return {Graph} Returns itself.
  */
  function translateNodes(nodeids, dX, dY, sceneX, sceneY, ratio) {
    nodeids.forEach(function(nodeid) {
      var node = self.nodesIndex[nodeid];
      node['x'] = (node['displayX'] - sceneX + dX) / ratio;
      node['y'] = (node['displayY'] - sceneY + dY) / ratio;
    });

    return self;
  };


  /**
   * Determines the borders of the graph as it will be drawn. It is used to
   * avoid the user to drag the graph out of the canvas.
   */
  function setBorders() {
    self.borders = {};

    self.nodes.forEach(function(node) {
      self.borders.minX = Math.min(
        self.borders.minX == undefined ?
          node['displayX'] - node['displaySize'] :
          self.borders.minX,
        node['displayX'] - node['displaySize']
      );

      self.borders.maxX = Math.max(
        self.borders.maxX == undefined ?
          node['displayX'] + node['displaySize'] :
          self.borders.maxX,
        node['displayX'] + node['displaySize']
      );

      self.borders.minY = Math.min(
        self.borders.minY == undefined ?
          node['displayY'] - node['displaySize'] :
          self.borders.minY,
        node['displayY'] - node['displaySize']
      );

      self.borders.maxY = Math.max(
        self.borders.maxY == undefined ?
          node['displayY'] - node['displaySize'] :
          self.borders.maxY,
        node['displayY'] - node['displaySize']
      );
    });
  }

  /**
   * Checks which nodes are under the (mX, mY) points, representing the mouse
   * position.
   * @param  {number} mX The mouse X position.
   * @param  {number} mY The mouse Y position.
   * @return {Graph} Returns itself.
   */
  function checkHover(mX, mY) {
    var dX, dY, s, over = [], out = [];
    self.nodes.forEach(function(node) {
      if (node['hidden']) {
        node['hover'] = false;
        return;
      }

      dX = Math.abs(node['displayX'] - mX);
      dY = Math.abs(node['displayY'] - mY);
      s = node['displaySize'];

      var oldH = node['hover'];
      var newH = dX < s && dY < s && Math.sqrt(dX * dX + dY * dY) < s;

      if (oldH && !newH) {
        node['hover'] = false;
        out.push(node.id);
      } else if (newH && !oldH) {
        node['hover'] = true;
        over.push(node.id);
      }
    });

    over.length && self.dispatch('overnodes', over);
    out.length && self.dispatch('outnodes', out);

    return self;
  };

  /**
   * Checks which edges are under the (mX, mY) points, representing the mouse
   * position.
   * @param  {number} mX The mouse X position.
   * @param  {number} mY The mouse Y position.
   * @param  {number} mR The mouse zoom ratio.
   * @param  {string} defaultEdgeType 'line' | 'curve'.
   * @return {Graph} Returns itself.
   */
  function checkHoverEdge(mX, mY, mR, defaultEdgeType) {
    var dX, dY, s, over = [], out = [];
    var epsilon = Math.abs(Math.log(1/ (mR * mR) )) * 100 || 100 ;
    self.edges.forEach(function(edge) {
      if (edge['hidden']) {
        edge['hover'] = false;
        return;
      }

      var x1 = edge['source']['displayX'];
      var y1 = edge['source']['displayY'];
      var s1 = edge['source']['displaySize'];
      var x2 = edge['target']['displayX'];
      var y2 = edge['target']['displayY'];
      var s2 = edge['target']['displaySize'];
      var w = edge['displaySize'];

      dX1 = Math.abs(x1 - mX);
      dY1 = Math.abs(y1 - mY);
      dX2 = Math.abs(x2 - mX);
      dY2 = Math.abs(y2 - mY);

      var oldH = edge['hover'];
      var newH;

      if (x1 == x2 && y1 == y2 ||
        dX1 < s1 && dY1 < s1 ||
        dX2 < s2 && dY2 < s2) {
        newH = false;
      } else {
        switch (self.edgeType || defaultEdgeType) {
          case 'curve':
            // var xi = (x1 + x2) / 2 + (y2 - y1) / 4;
            // var yi = (y1 + y2) / 2 + (x1 - x2) / 4;
            //TODO
          break;
          case 'line':
          default:
            var isBetweenExtremities = Math.min(x1, x2) < mX && mX < Math.max(x1, x2) && Math.min(y1, y2) < mY && mY < Math.max(y1, y2);
            if (isBetweenExtremities) {
              var crossproduct = Math.abs((mY - y1) * (x2 - x1) - (mX - x1) * (y2 - y1));
              newH = crossproduct < w * epsilon;
              newH && over.push(edge.id);
              // if (newH) {
              //   console.log("hover edge",edge['source'].id, edge['target'].id);
              // }
              // console.log(crossproduct, w, mR, w * mR * mR);
            }
          break;
        }
      }

      edge['hover'] = newH;
      oldH && !newH && out.push(edge.id);
    });

    over.length && self.dispatch('overedges', over);
    out.length && self.dispatch('outedges', out);

    return self;
  };


  /**
   * Applies a function to a clone of each node (or indicated nodes), and then
   * tries to apply the modifications made on the clones to the original nodes.
   * @param  {function(Object)} fun The function to execute.
   * @param  {?Array.<string>} ids  An Array of node IDs (optional).
   * @return {Graph} Returns itself.
   */
  function iterNodes(fun, ids) {
    var a = ids ? ids.map(function(id) {
      return self.nodesIndex[id];
    }) : self.nodes;

    var aCopies = a.map(cloneNode);
    aCopies.forEach(fun);

    a.forEach(function(n, i) {
      checkNode(n, aCopies[i]);
    });

    return self;
  };

  /**
   * Applies a function to a clone of each edge (or indicated edges), and then
   * tries to apply the modifications made on the clones to the original edges.
   * @param  {function(Object)} fun The function to execute.
   * @param  {?Array.<string>} ids  An Array of edge IDs (optional).
   * @return {Graph} Returns itself.
   */
  function iterEdges(fun, ids) {
    var a = ids ? ids.map(function(id) {
      return self.edgesIndex[id];
    }) : self.edges;

    var aCopies = a.map(cloneEdge);
    aCopies.forEach(fun);

    a.forEach(function(e, i) {
      checkEdge(e, aCopies[i]);
    });

    return self;
  };

  /**
   * Returns a specific node clone or an array of specified node clones.
   * @param  {(string|Array.<string>)} ids The ID or an array of node IDs.
   * @return {(Object|Array.<Object>)} The clone or the array of clones.
   */
  function getNodes(ids) {
    var a = ((ids instanceof Array ? ids : [ids]) || []).map(function(id) {
      return cloneNode(self.nodesIndex[id]);
    });

    return (ids instanceof Array ? a : a[0]);
  };

  /**
   * Returns a specific edge clone or an array of specified edge clones.
   * @param  {(string|Array.<string>)} ids The ID or an array of edge IDs.
   * @return {(Object|Array.<Object>)} The clone or the array of clones.
   */
  function getEdges(ids) {
    var a = ((ids instanceof Array ? ids : [ids]) || []).map(function(id) {
      return cloneEdge(self.edgesIndex[id]);
    });

    return (ids instanceof Array ? a : a[0]);
  };

  empty();

  this.addNode = addNode;
  this.addEdge = addEdge;
  this.dropNode = dropNode;
  this.dropEdge = dropEdge;

  this.iterEdges = iterEdges;
  this.iterNodes = iterNodes;

  this.getEdges = getEdges;
  this.getNodes = getNodes;

  this.empty = empty;
  this.rescale = rescale;
  this.translate = translate;
  this.translateNodes = translateNodes;
  this.setBorders = setBorders;
  this.checkHover = checkHover;
  this.checkHoverEdge = checkHoverEdge;
}

