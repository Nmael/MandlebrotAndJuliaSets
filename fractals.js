function Fractal(config) {
    this.canvas = config['canvas'];
    this.iters = config['iters']? config['iters'] : 20;
    this.aspectRatio = config['aspectRatio'] ? config['aspectRatio'] : [3, 2];
    this.xRange = [undefined, undefined];
    this.yRange = [undefined, undefined];
}

Fractal.prototype.draw = function() {
    // base classes override this
}

function MandlebrotFractal(canvas) {
    Fractal.call(this, canvas);
    this.xRange = [-2.5, 1];
    this.yRange = [-1, 1];
}

MandlebrotFractal.prototype = Object.create(Fractal.prototype);

MandlebrotFractal.prototype.toFractalSpace = function (x, y) {
    return {
        x: ((x * (this.xRange[1] - this.xRange[0])) / this.canvas.width) + this.xRange[0],
        y: (((this.canvas.height - y) * (this.yRange[1] - this.yRange[0])) / this.canvas.height) + this.yRange[0]
    };
}

MandlebrotFractal.prototype.draw = function () {
    var startTime = new Date().getTime();
    var context = this.canvas.getContext('2d');

    var pixels = context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    for(var y = 0; y < this.canvas.height; ++y) {
        for(var x = 0; x < this.canvas.width; ++x) {
            var zr = 0;
            var zi = 0;

            var newCoords = this.toFractalSpace(x, y);
            var cr = newCoords.x;
            var ci = newCoords.y;
            var inside = true;

            var itersTaken = 0;
            for(; itersTaken < this.iters; ++itersTaken) {
                var zr2 = zr*zr;
                var zi2 = zi*zi;
                zi = 2 * zr * zi + ci;
                zr = zr2 - zi2 + cr;

                if( zr2 + zi2 > 4 ) {
                    inside = false;
                    break;
                }
            }

            var r, g, b;
            if(inside) {
                r = 0;
                b = 0;
                g = 0;
            } else {
                r = 255 - 255 * (itersTaken / this.iters);
                g = 0;
                b = 255 * (itersTaken/this.iters);
            }

            var index = (x + y * this.canvas.width) * 4;
            pixels.data[index + 0] = r;
            pixels.data[index + 1] = g;
            pixels.data[index + 2] = b;
            pixels.data[index + 3] = 255;
        }
    }

    var renderTime = (new Date().getTime() - startTime)/1000; // convert from ms to s
    context.putImageData(pixels, 0, 0);
    
    context.save();
    context.scale(1, -1);
    context.drawImage(this.canvas, 0, -this.canvas.height);
    context.restore();
}

MandlebrotFractal.prototype.zoom = function (level, canvasX, canvasY) {
    var center = this.toFractalSpace(canvasX, canvasY);
    var oldCenter = {x: (this.xRange[0] + this.xRange[1]) / 2,
                     y: (this.yRange[0] + this.yRange[1]) / 2};
    var xDiff = center.x - oldCenter.x;
    var yDiff = center.y - oldCenter.y;

    this.xRange = [(this.xRange[0] + xDiff) / level, (this.xRange[1] + xDiff) / level];
    this.yRange = [(this.yRange[0] - yDiff) / level, (this.yRange[1] - yDiff) / level]; // subtract because y index is 0 at top and max at bottom

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
    var canvas = document.getElementById('c');
    var posP = document.getElementById('mousePos');

    fractal = new MandlebrotFractal({'canvas': canvas,
                                     'iters': 20}
            );
    fractal.draw();

    canvas.addEventListener('mousemove', function(e) {
            var mousePos = getMousePos(e, canvas);
            posP.innerHTML = mousePos.x + ', ' + mousePos.y;
            }, false);
    canvas.addEventListener('click', function(e) {
            var mousePos = getMousePos(e, canvas);
            fractal.zoom(1.5, mousePos.x, mousePos.y);
            }, false);
};
