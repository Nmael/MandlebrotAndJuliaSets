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
}

Fractal.prototype.draw = function() {
    // base classes override this
}

Fractal.prototype.getEscapeColor = function(itersTaken) {
    var r, g, b;
    if(itersTaken != Infinity) {
        r = 255 - 255 * (itersTaken / this.iters);
        g = 0;
        b = 255 * (itersTaken/this.iters);
    } else {
        r = g = b = 0;
    }
    
    return [r, g, b];
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

function MandlebrotFractal(config) {
    Fractal.call(this, config);
    this.xRange = [-2.5, 1];
    this.yRange = [-1, 1];
}

MandlebrotFractal.prototype = Object.create(Fractal.prototype);

MandlebrotFractal.prototype.iterate = function(cr, ci) {
    var zr = 0;
    var zi = 0;
    var itersTaken = 0;
    for(; itersTaken < this.iters; ++itersTaken) {
        var zr2 = zr*zr;
        var zi2 = zi*zi;
        zi = 2 * zr * zi + ci;
        zr = zr2 - zi2 + cr;

        if( zr2 + zi2 > 4 ) { // we escaped!
            return itersTaken;
            break;
        }
    }

    return Infinity;  // we never escaped - we're inside the Mandlebrot
}

MandlebrotFractal.prototype.draw = function () {
    var pixels = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

    for(var y = 0; y < this.canvas.height; ++y) {
        for(var x = 0; x < this.canvas.width; ++x) {
            var newCoords = this.toFractalSpace(x, y);
            var cr = newCoords.x / this.scale;
            var ci = newCoords.y / this.scale;
            var itersTaken = this.iterate(cr, ci);
            var color = this.getEscapeColor(itersTaken);

            this.setPixel(pixels, x, y, color);
        }
    }

    this.showPixels(pixels);
}

MandlebrotFractal.prototype.zoom = function (level, canvasX, canvasY) {
    var center = this.toFractalSpace(canvasX, canvasY);
    var oldCenter = {x: (this.xRange[0] + this.xRange[1]) / 2,
                     y: (this.yRange[0] + this.yRange[1]) / 2};

    var xDiff = center.x - oldCenter.x;
    var yDiff = center.y - oldCenter.y;

    this.xRange = [(this.xRange[0] + xDiff), (this.xRange[1] + xDiff)];
    this.yRange = [(this.yRange[0] - yDiff), (this.yRange[1] - yDiff)]; // subtract because y index is 0 at top and max at bottom

    //this.scale *= level;

    this.draw();
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
            return itersTaken;
            break;
        }
    }

    return Infinity;  // we never escaped - we're inside the Mandlebrot
}

JuliaFractal.prototype.draw = function () {
    var pixels = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

    for(var y = 0; y < this.canvas.height; ++y) {
        for(var x = 0; x < this.canvas.width; ++x) {
            var newCoords = this.toFractalSpace(x, y);
            var itersTaken = this.iterate(newCoords.x, newCoords.y);
            var color = this.getEscapeColor(itersTaken);

            this.setPixel(pixels, x, y, color);
        }
    }

    this.showPixels(pixels);
}

JuliaFractal.prototype.zoom = function (level, canvasX, canvasY) {
    var center = this.toFractalSpace(canvasX, canvasY);
    var oldCenter = {x: (this.xRange[0] + this.xRange[1]) / 2,
                     y: (this.yRange[0] + this.yRange[1]) / 2};

    var xDiff = center.x - oldCenter.x;
    var yDiff = center.y - oldCenter.y;

    this.xRange = [(this.xRange[0] + xDiff), (this.xRange[1] + xDiff)];
    this.yRange = [(this.yRange[0] - yDiff), (this.yRange[1] - yDiff)]; // subtract because y index is 0 at top and max at bottom

    //this.scale *= level;

    this.draw();
}

function getMousePos(e, canvas) {
    r = canvas.getBoundingClientRect();
    return {
        x: e.clientX - r.left,
        y: e.clientY - r.top
    };
}

window.onload = function() {
    renderFractal();
    $('renderBtn').addEventListener('click', function(e) {
        renderFractal()
    }, false);

    if ($_GET('f') == 'j') {
        $('juliaRow').style.display = 'none';
    }
}

function loadConfig() {
    var config = {'canvas': $('c'),
                  'iters': $('iterations').value,
                  'showAxes': $('axes').checked};

    return config;
}

function renderFractal() {
    var canvas = $('c');
    var posP = $('mousePos');
    var config = loadConfig();

    var fractal;
    if($_GET('f') == 'j') {
        config['cr'] = parseFloat($_GET('r')),
        config['ci'] = parseFloat($_GET('i'));
        fractal = new JuliaFractal(config);
    } else {
        fractal = new MandlebrotFractal(config);
    }

    fractal.draw();

    canvas.addEventListener('mousemove', function(e) {
            var mousePos = getMousePos(e, canvas);
            posP.innerHTML = '(' + mousePos.x + ', ' + mousePos.y + ')';
            }, false);

        canvas.addEventListener('click', function(e) {
            var mousePos = getMousePos(e, canvas);
            if ($('clickZoom').checked) {
                fractal.zoom();
            } else if($_GET('f') != 'j') {
                var fPos = fractal.toFractalSpace(mousePos.x, mousePos.y)
                window.open(document.URL + '?f=j&r=' + fPos.x + '&i=' + fPos.y);
            }
        }, false);
}
