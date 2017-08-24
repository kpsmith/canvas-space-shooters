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
    var players = [];

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
        for (var i = 0; i < 10; i++){
            players.push(player('blue'));
            players.push(player('purple'));
            players.push(player('yellow'));
            players.push(player('green'));
            players.push(player('white'));
            players.push(player('orange'));
            players.push(player('pink'));
        }

        for (var idx in players) {
            scene.push(players[idx]);
        }

        animate();
        doLogic();
    })();

    function player(color, vel) {
        return {
            x: canvas.width * Math.random(),
            y: canvas.height * Math.random(),
            r: 20,
            color: color,
            xDir: Math.round(Math.random()) * 2 - 1,
            yDir: Math.round(Math.random()) * 2 - 1,
            vel: 1,
            cooldown: 0,
            maxCooldown: 30,
            maxRange: Infinity,
            // closestDist: Infinity,
            health: 100,
            draw: function() {
                // if ( this.health < 0 ) {
                //     return;
                // }
                context.beginPath();
                context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
                context.fillStyle = this.color;

                context.fill();
                context.lineWidth = 2;
                context.strokeStyle = '#000000';
                context.stroke();

            },
            think: function() {
                // death
                if ( this.health < 0 ) {
                    scene.push(playerDeath(this));
                    sceneDelete(this);
                    playersDelete(this);
                    return;
                }
                // movement
                this.x += this.xDir * this.vel;
                if (this.x > canvas.width) {
                    this.xDir = -1;
                }
                if (this.x < 0) {
                    this.xDir = 1;
                }
                this.y += this.yDir * this.vel;
                if (this.y > canvas.height) {
                    this.yDir = -1;
                }
                if (this.y < 0) {
                    this.yDir = 1;
                }
                // combat
                this.cooldown -= 1;
                if (this.cooldown < 0 && players.length > 1) {
                    // targetting
                    var closestDist = Infinity;
                    var closestTarget;
                    for (var idx in players) {
                        var target = players[idx];
                        if (target !== this) {
                            var targetDist = distance(this, target);
                            if (targetDist < closestDist) {
                                closestDist = targetDist;

                                closestTarget = target;
                            }
                        }
                    }
                    // attack!
                    if (closestDist < this.maxRange) {
                        this.fire(closestTarget);
                        this.cooldown = this.maxCooldown;
                    }
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
            color: 'yellow',
            dir: 1,
            yDir: 1,
            vel: 5,
            target: targetPlayer,
            draw: function() {
                context.beginPath();
                context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
                // var gradient = context.createRadialGradient(this.x, this.y, 1, this.x, this.y, this.r);
                // gradient.addColorStop(0, 'black');
                // gradient.addColorStop(1, 'red');
                context.fillStyle = this.color;
                context.shadowBlur = this.r;
                context.shadowColor = "red";
                context.fill();
                context.shadowBlur = 0;
                // context.lineWidth = 2;
                // context.strokeStyle = '#000000';
                // context.stroke();
            },
            think: function() {
                var deltaX = targetPlayer.x - this.x;
                var deltaY = targetPlayer.y - this.y;
                if ( targetPlayer.health < 0 ) {
                    boom(this.x, this.y);
                    sceneDelete(this);
                }
                if (Math.abs(deltaX) < targetPlayer.r + this.r && Math.abs(deltaY) < targetPlayer.r + this.r) {
                    boom(this.x, this.y);
                    targetPlayer.health -= randFloat(5,10);
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
        var maxScaleSpeed = 2;
        for (var angle = 0; angle < 360; angle += Math.round(360 / count)) {
            var speed = randFloat(minSpeed, maxSpeed);

            var xVel = speed * Math.cos(angle * Math.PI / 180.0);
            var yVel = speed * Math.sin(angle * Math.PI / 180.0);

            var scaleSpeed = randFloat(minScaleSpeed, maxScaleSpeed);
            var radius = randFloat(minSize, maxSize);

            scene.push(particle(x, y, xVel, yVel, scaleSpeed, radius, color));

        }
    }
    function playerDeath(player) {
        return {
            ttl: 30,
            think: function() {},
            draw: function() {
                this.ttl -= 1;
                if ( this.ttl < 0 ) {
                    sceneDelete(this);
                }
                if ( this.ttl % 2 === 0 ) {
                    boom(player.x + randFloat(50,200), player.y + randFloat(50, 200));
                }
            }
        };
    }

    function winBanner(player) {
        return {
            think: function() {},
            draw: function() {
                context.font = "100px Fugaz One";
                context.fillStyle = '#fbfcf7';
                context.strokeStyle = '#000000';
                context.fillText("Winner!", player.x - 200, player.y - 40);
                context.strokeText("Winner!", player.x - 200, player.y - 40);
            }
        };
    }
    function playersDelete(obj) {
        var delIdx;
        for (var idx in players) {
            if (players[idx] === obj) {
                delIdx = idx;
            }
        }
        players.splice(delIdx, 1);
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
    function distance(objA, objB) {
        return Math.sqrt(Math.pow((objA.x - objB.x), 2) + Math.pow((objA.y - objB.y), 2));
    }
    function randFloat(min, max) {
        return min + Math.random() * (max - min);
    }

    function doLogic() {
        for (var idx in scene) {
            scene[idx].think();
        }
        if ( players.length == 1) {
            scene.push(winBanner(players[0]));
            players[0].health = Infinity;
        }

        setTimeout(doLogic, 1000 / 60);
        
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
