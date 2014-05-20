/*
 * Programming Project #4
 * CSSE 325
 * Nate Moore
 * CM 722
 *
 * fractal.js
 *  Render logic.
 *  Contains the abstract Fractal class, which is expanded
 *  upon to generate the Mandlebrot and Julia fractals.
 *  Interfaces with the Mandlebrot.html file to display fractals.
 *  Depending on GET parameters (in the URL), displays a Julia
 *  or Mandlebrot fractal. If a Julia fractal, grabs z from the URL.
 */

function $(id) {
    return document.getElementById(id);
}

function $_GET(name) {
    /* 
     * Code for this function courtesy Artem Barger as posted on StackOverflow.com.
     * http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript/901144#901144
     */

    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function Fractal(config) {
    this.canvas = config['canvas'];
    this.context = this.canvas.getContext('2d');
    this.iters = config['iters']? config['iters'] : 20;
    this.aspectRatio = config['aspectRatio'] ? config['aspectRatio'] : [3, 2];
    this.scale = config['scale'] ? config['scale'] : 1;
    this.showAxes = config['showAxes'] ? config['showAxes'] : false;
    this.xRange = [undefined, undefined];
    this.yRange = [undefined, undefined];
    this.colorType = config['colorType'] ? config['colorType'] : 'smooth';

    this.colormap = [];
    this.genLinearColormap();
}

Fractal.prototype.draw = function() {
    // base classes override this
}

Fractal.prototype.genLinearColormap = function() {
    for(var i = 0; i < this.iters; ++i) {
        var f = i / this.iters;
        this.colormap[i] = [255 - 255 * f,
                  0,
                  255 * f];
    }
}

Fractal.prototype.getEscapeColor = function(value, itersTaken) {
    if(this.colorType == 'linear') {
        if(itersTaken != Infinity) return this.colormap[itersTaken];
        else return [0, 0, 0];
    } else { // continuous smooth coloring
        var h, s, v;
        if(itersTaken != Infinity) {
            h = (itersTaken - Math.log(Math.log(value)) / Math.LN2)/this.iters;
            s = 1;
            v = 1;
        } else {
            h = s = v = 0;
        }
    
        return this.hsvToRgb(h, s, v);
    }
}

Fractal.prototype.setPixel = function(pixels, x, y, color) {
    if(this.showAxes && (x == this.canvas.width / 2 || y == this.canvas.height / 2)) {
            color[0] = color[1] = color[2] = 255;
    }

    var index = (x + y * this.canvas.width) * 4;
    pixels.data[index + 0] = color[0];
    pixels.data[index + 1] = color[1];
    pixels.data[index + 2] = color[2];
    pixels.data[index + 3] = 255;
}

Fractal.prototype.showPixels = function(pixels) {
    this.context.putImageData(pixels, 0, 0);
    this.context.save();
    this.context.scale(1, -1);
    this.context.drawImage(this.canvas, 0, -this.canvas.height);
    this.context.restore();
}

Fractal.prototype.toFractalSpace = function (x, y) {
    return {
        x: ((x * (this.xRange[1] - this.xRange[0])) / this.canvas.width) + this.xRange[0],
        y: (((this.canvas.height - y) * (this.yRange[1] - this.yRange[0])) / this.canvas.height) + this.yRange[0]
    };
}

Fractal.prototype.zoom = function(level, canvasX, canvasY) {
    var center = this.toFractalSpace(canvasX, canvasY);
    var oldCenter = {x: (this.xRange[0] + this.xRange[1]) / 2,
                     y: (this.yRange[0] + this.yRange[1]) / 2};

    var xDiff = center.x - oldCenter.x;
    var yDiff = center.y - oldCenter.y;
    this.xRange = [this.xRange[0] + xDiff, this.xRange[1] + xDiff];
    this.yRange = [this.yRange[0] - yDiff, this.yRange[1] - yDiff];

    var xSpan = (this.xRange[1] - this.xRange[0]) / 4;
    var ySpan = (this.yRange[1] - this.yRange[0]) / 4;
    var cx = (this.xRange[0] + this.xRange[1]) / 2;
    var cy = (this.yRange[0] + this.yRange[1]) / 2;
    this.xRange = [cx - xSpan, cx + xSpan];
    this.yRange = [cy - ySpan, cy + ySpan];

    this.draw();
}

Fractal.prototype.hsvToRgb = function(h, s, v) {
    /*
     * Code for this function courtesy Garry Tan, at
     * http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c.
     * His post is actually a reference to another author, but the referring link does not work.
     * Note that the domain of H is [0, 1], NOT [0, 360].
     */
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [r * 255, g * 255, b * 255];
}

function MandlebrotFractal(config) {
    Fractal.call(this, config);
    this.xRange = [-2.5, 1];
    this.yRange = [-1, 1];
}

MandlebrotFractal.prototype = Object.create(Fractal.prototype);

MandlebrotFractal.prototype.iterate = function(cr, ci) {
    var inf = {'value': 0, 'iters': Infinity};

    // cardiod test: if true, we are in the carodiod and don't need to further check
    cro = cr - 0.25;
    ci2 = ci*ci;
    q = cro*cro + ci2;
    if(q * (q + cro) < 0.25 * ci2) {
        return inf;
    }

    // bulb test; if true, in the bulb
    cra = cr + 1;
    if(cra*cra + ci2 < 0.0625) {
        return inf;
    }

    var zr = zi = prevZr = prevZi = 0;
    var itersTaken = 0;
    var lastWasInside = false;
    for(; itersTaken < this.iters; ++itersTaken) {
        var zr2 = zi2 = 0;
        zr2 = zr*zr;
        zi2 = zi*zi;
        zi = 2 * zr * zi + ci;
        zr = zr2 - zi2 + cr;

        if(lastWasInside && zr == prevZr && zi == prevZi) {
            lastWasInside = false;
            return inf;
        }

        prevZr = zr;
        prevZi = zi;

        if( zr2 + zi2 > 4 ) { // we escaped!
            return {'value': Math.sqrt(zr2 + zi2), 'iters': itersTaken};
            lastWasInside = true;
            break;
        }
    }

    lastWasInside = false;
    return inf; // we didn't escape - we're inside the Mandlebrot
}

MandlebrotFractal.prototype.draw = function () {
    var pixels = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

    for(var y = 0; y < this.canvas.height; ++y) {
        for(var x = 0; x < this.canvas.width; ++x) {
            var newCoords = this.toFractalSpace(x, y);
            var cr = newCoords.x;
            var ci = newCoords.y;
            var result = this.iterate(cr, ci);
            var color = this.getEscapeColor(result['value'], result['iters']);

            this.setPixel(pixels, x, y, color);
        }
    }

    this.showPixels(pixels);
}

function JuliaFractal(config) {
    Fractal.call(this, config);
    this.xRange = [-1.5, 1.5];
    this.yRange = [-1, 1];
    this.cr = config['cr']? config['cr'] : 0;
    this.ci = config['ci']? config['ci'] : 0;
}

JuliaFractal.prototype = Object.create(Fractal.prototype);

JuliaFractal.prototype.iterate = function(zr, zi) {
    var itersTaken = 0;
    for(; itersTaken < this.iters; ++itersTaken) {
        var zr2 = zr*zr;
        var zi2 = zi*zi;
        zi = 2 * zr * zi + this.ci;
        zr = zr2 - zi2 + this.cr;

        if( zr2 + zi2 > 4 ) { // we escaped!
            return [Math.sqrt(zr2 + zi2), itersTaken];
            break;
        }
    }

    return [0, Infinity];  // we never escaped - we're inside the Mandlebrot
}

JuliaFractal.prototype.draw = function () {
    var pixels = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

    for(var y = 0; y < this.canvas.height; ++y) {
        for(var x = 0; x < this.canvas.width; ++x) {
            var newCoords = this.toFractalSpace(x, y);
            var result = this.iterate(newCoords.x, newCoords.y);
            var color = this.getEscapeColor(result['value'], result['iters']);

            this.setPixel(pixels, x, y, color);
        }
    }

    this.showPixels(pixels);
}

function getMousePos(e, canvas) {
    r = canvas.getBoundingClientRect();
    return {
        x: e.clientX - r.left,
        y: e.clientY - r.top
    };
}

var PageFractal = undefined;
window.onload = function() {
    if(getFractalType() == 'julia') {
        $('fractalName').innerHTML = 'Julia';
        $('juliaLoc').style.display = 'inline';
        var precision = 6;
        $('juliaX').innerHTML = Math.round($_GET('r') * Math.pow(10, precision)) / Math.pow(10, precision);
        $('juliaX').title = $_GET('r');
        $('juliaY').innerHTML = Math.round($_GET('i') * Math.pow(10, precision)) / Math.pow(10, precision);
        $('juliaY').title = $_GET('i');
    } else {
        $('fractalName').innerHTML = 'Mandlebrot';
    }

    renderFractal();

    $('renderBtn').addEventListener('click', function(e) {
        renderFractal();
    }, false);

    if ($_GET('f') == 'j') {
        $('juliaRow').style.display = 'none';
    }

    $('c').addEventListener('mousemove', function(e) {
            var mousePos = getMousePos(e, $('c'));
            $('mousePos').innerHTML = '(' + mousePos.x + ', ' + mousePos.y + ')';
            if($_GET('f') != 'j') {
                $('mousePos').innerHTML = '<a id="juliaLink" target="new" href="' + juliaLink(PageFractal, mousePos.x, mousePos.y) + '">' + $('mousePos').innerHTML + '</a>';
            }
    }, false);

    $('c').addEventListener('click', function(e) {
        var mousePos = getMousePos(e, $('c'));
        if ($('clickZoom').checked) {
            PageFractal.zoom(2, mousePos.x, mousePos.y);
        } else if(getFractalType() == 'mandlebrot') {
            window.open(juliaLink(PageFractal, mousePos.x, mousePos.y));
        }
    }, false);

}

function renderFractal() {
    var start = new Date().getTime();
    loadFractalConfig();
    PageFractal.draw();
    var end = new Date().getTime();
    var runTime = end - start;
    $('renderTime').innerHTML = runTime;
}

function getFractalType() {
    if($_GET('f') == 'j') return 'julia';

    return 'mandlebrot';
}

function juliaLink(fractal, cx, cy) { // converts canvas X, Y to fractal X, Y
    var fPos = fractal.toFractalSpace(cx, cy)
    return document.URL + '?f=j&r=' + fPos.x + '&i=' + fPos.y;
}

function loadFractalConfig() {
    var config = loadControls();
    if(getFractalType() == 'julia') {
        config['cr'] = parseFloat($_GET('r')),
        config['ci'] = parseFloat($_GET('i'));
    }

    if(PageFractal) {
        var keys = Object.keys(config);
        for(var i = 0; i < keys.length; ++i) {
            PageFractal[keys[i]] = config[keys[i]];
        }

        PageFractal.genLinearColormap();
    }
    else if(getFractalType() == 'julia') {
        PageFractal = new JuliaFractal(config);
    } else {
        PageFractal = new MandlebrotFractal(config);
    }
}

function loadControls() {
    var controls = {};
    controls['canvas'] = $('c');
    controls['iters'] = $('iterations').value;
    controls['showAxes'] = $('axes').checked;
    if($('coloringLinear').checked) {
        controls['colorType'] = 'linear';
    } else {
        controls['colorType'] = 'smooth';
    }

    return controls;
}
