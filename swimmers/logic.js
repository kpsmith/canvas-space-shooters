// boilerplate
window.requestAnimFrame = (function(callback) {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
    };
})();

$(document).ready(function() {
    var canvas = document.getElementById('drawArea');
    var context = canvas.getContext('2d');
    var scene = [];

    function resizeCanvas() {
        var widthWanted = $(window).width();
        var heightWanted = $(window).height();

        canvas.width = widthWanted;
        canvas.height = heightWanted;

        $("#drawArea").css("width", widthWanted);
        $("#drawArea").css("height", heightWanted);
    }
    $(window).resize(resizeCanvas());

    // Init
    (function() {
        resizeCanvas();
        scene.push(player(canvas.width * Math.random(), canvas.height * Math.random(), 20, 'blue', 2.0, 0));
        scene.push(player(canvas.width * Math.random(), canvas.height * Math.random(), 20, 'purple', 2.0, 1));
        scene.push(player(canvas.width * Math.random(), canvas.height * Math.random(), 20, 'yellow', 2.0, 1));
        // scene.push(particle(100,100,2,3,0.5,20,'red'));
        animate();
        doLogic();

        function foo() {
            scene[0].fire(scene[1]);
            setTimeout(foo, randFloat(500, 1000));
        }
        foo();

        function bar() {
            scene[1].fire(scene[2]);
            setTimeout(bar, randFloat(500, 1000));
        }
        bar();

        function baz() {
            scene[2].fire(scene[0]);
            setTimeout(baz, randFloat(500, 1000));
        }
        baz();

    })();

    function player(x, y, r, color, vel, idx) {
        return {
            idx: idx,
            x: x,
            y: y,
            r: r,
            color: color,
            dir: 1,
            yDir: 1,
            vel: vel,
            draw: function() {
                context.beginPath();
                context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
                context.fillStyle = this.color;
                context.fill();
                context.lineWidth = 2;
                context.strokeStyle = '#000000';
                context.stroke();
            },
            think: function() {
                this.x += this.dir * this.vel;
                if (this.x > canvas.width) {
                    this.dir = -1;
                }
                if (this.x < 0) {
                    this.dir = 1;
                }
                this.y += this.yDir * this.vel;
                if (this.y > canvas.height) {
                    this.yDir = -1;
                }
                if (this.y < 0) {
                    this.yDir = 1;
                }
            },
            fire: function(targetPlayer) {
                scene.push(projectile(this.x, this.y, targetPlayer));
            }
        };
    }

    function projectile(x, y, targetPlayer) {
        return {
            x: x,
            y: y,
            r: 4,
            color: 'red',
            dir: 1,
            yDir: 1,
            vel: 4,
            target: targetPlayer,
            draw: function() {
                context.beginPath();
                context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
                context.fillStyle = this.color;
                context.fill();
                // context.lineWidth = 2;
                // context.strokeStyle = '#000000';
                // context.stroke();
            },
            think: function() {
                var deltaX = targetPlayer.x - this.x;
                var deltaY = targetPlayer.y - this.y;
                if (Math.abs(deltaX) < targetPlayer.r + this.r && Math.abs(deltaY) < targetPlayer.r + this.r) {
                    boom(this.x, this.y);
                    sceneDelete(this);
                }
                var factor = this.vel / Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
                this.x += factor * deltaX;
                this.y += factor * deltaY;
            }
        };
    }

    function particle(x, y, xVel, yVel, scaleSpeed, r, color) {
        return {
            x: x,
            y: y,
            r: r,
            color: color,
            xVel: xVel,
            yVel: yVel,
            scaleSpeed: scaleSpeed,
            draw: function() {
                context.beginPath();
                context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
                context.fillStyle = this.color;
                context.fill();
            },
            think: function() {
                // move
                this.x += this.xVel;
                this.y += this.yVel;
                // shrink
                this.r -= this.scaleSpeed;
                if (this.r < 0) {
                    sceneDelete(this);
                }
            }
        };
    }

    function boom(x, y) {
        expl(x, y, "#525252");
        expl(x, y, "#FFA318");
    }

    function expl(x, y, color) {
        var minSize = 5;
        var maxSize = 15;
        var count = 10;
        var minSpeed = 1;
        var maxSpeed = 5;
        var minScaleSpeed = 0.4;
        var maxScaleSpeed = 1;
        for (var angle = 0; angle < 360; angle += Math.round(360 / count)) {
            var speed = randFloat(minSpeed, maxSpeed);

            var xVel = speed * Math.cos(angle * Math.PI / 180.0);
            var yVel = speed * Math.sin(angle * Math.PI / 180.0);

            var scaleSpeed = randFloat(minScaleSpeed, maxScaleSpeed);
            var radius = randFloat(minSize, maxSize);

            scene.push(particle(x, y, xVel, yVel, scaleSpeed, radius, color));

        }
    }

    function sceneDelete(obj) {
        var delIdx;
        for (var idx in scene) {
            if (scene[idx] === obj) {
                delIdx = idx;
            }
        }
        scene.splice(delIdx, 1);
    }

    function randFloat(min, max) {
        return min + Math.random() * (max - min);
    }

    function doLogic() {
        for (var idx in scene) {
            scene[idx].think();
        }
        setTimeout(doLogic, 1000 / 30);
    }

    function animate() {
        // update

        // clear
        context.clearRect(0, 0, canvas.width, canvas.height);

        // draw stuff
        for (var idx in scene) {
            scene[idx].draw();
        }

        // request new frame
        requestAnimFrame(function() {
            animate();
        });
    }
});
