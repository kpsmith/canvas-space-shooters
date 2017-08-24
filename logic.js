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
    var scene = new Set();
    var players = new Set();

    var maxParticles = 500;
    // var particles = [];
    // var particleIdx = 0;
    var dirty = false;
    var curPerfBucketStart = undefined;
    var ticks = 0;

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
        var numPlayers = 300;
        for (var i = 0; i < numPlayers; i++) {
            var hue = i % 256;
            if (numPlayers < 255) {
                hue = hue * (255 / numPlayers);
            }
            var color = 'hsl(' + hue + ', 80%, 60%)';
            players.add(player(color));
        }
        players.forEach(function(player) {
        	scene.add(player);
        })
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

                context.lineWidth = this.health / 5;
                context.strokeStyle = 'hsla(189, 86%, 51%, 0.7)';
                context.stroke();

                context.fillStyle = this.color;

                context.fill();


            },
            think: function() {
                // death
                if (this.health < 0) {
                    scene.add(playerDeath(this));
                    sceneDelete(this);
                    playersDelete(this);
                    return;
                }
                // movement
                this.x += this.xDir * this.vel;
                if (this.x + this.r > canvas.width) {
                    this.xDir = -1;
                }
                if (this.x - this.r < 0) {
                    this.xDir = 1;
                }
                this.y += this.yDir * this.vel;
                if (this.y + this.r > canvas.height) {
                    this.yDir = -1;
                }
                if (this.y - this.r < 0) {
                    this.yDir = 1;
                }
                // combat
                this.cooldown -= 1;
                if (this.cooldown < 0 && players.size > 1) {
                    // targetting
                    var closestDist = Infinity;
                    var closestTarget;

                    players.forEach(function(target) {
                        if (target !== this) {
                            var targetDist = distance(this, target);
                            if (targetDist < closestDist) {
                                closestDist = targetDist;

                                closestTarget = target;
                            }
                        }
                    }.bind(this));
                    // attack!
                    if (closestDist < this.maxRange) {
                        this.fire(closestTarget);
                        this.cooldown = this.maxCooldown;
                    }
                }
            },
            fire: function(targetPlayer) {
                scene.add(projectile(this.x, this.y, targetPlayer));
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
                context.shadowBlur = this.r;
                context.shadowColor = "red";
                context.fill();
                context.shadowBlur = 0;
            },
            think: function() {
                var deltaX = targetPlayer.x - this.x;
                var deltaY = targetPlayer.y - this.y;
                if ( targetPlayer.health < 0 ) {
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
        var p = {
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
        return p;
    }

    function boom(x, y) {
        if (scene.size < maxParticles) {
            expl(x, y, "#525252");
            expl(x, y, "#FFA318");
        }
    }

    function expl(x, y, color) {
        var minSize = 5;
        var maxSize = 15;
        var count = 5;
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

            scene.add(particle(x, y, xVel, yVel, scaleSpeed, radius, color));

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
        players.delete(obj);
        // var delIdx;
        // for (var idx in players) {
        //     if (players[idx] === obj) {
        //         delIdx = idx;
        //     }
        // }
        // players.splice(delIdx, 1);
    }
    function sceneDelete(obj) {
        scene.delete(obj);
        // var delIdx;
        // for (var idx in scene) {
        //     if (scene[idx] === obj) {
        //         delIdx = idx;
        //     }
        // }
        // scene.splice(delIdx, 1);
    }
    function distance(objA, objB) {
        return Math.sqrt(Math.pow((objA.x - objB.x), 2) + Math.pow((objA.y - objB.y), 2));
    }
    function randFloat(min, max) {
        return min + Math.random() * (max - min);
    }

    var haveDisplayedWinBanner = false;
    function doLogic() {
        scene.forEach(function(element) {
            element.think();
        })
        if (players.size == 1 && !haveDisplayedWinBanner) {
            players.forEach(function(player) {
                player.health = Infinity;
                scene.add(winBanner(player));
                haveDisplayedWinBanner = true;
            });
        }
        ticks += 1;
        if (curPerfBucketStart === undefined) {
            curPerfBucketStart = Date.now();
        }
        if (Date.now() - curPerfBucketStart > 1000) {
            var msg = ticks + ' ticks per second';
            if (ticks < 30) {
                console.warn(msg);
            } else {
                console.log(msg);
            }
            ticks = 0;
            curPerfBucketStart = Date.now();
        }
        dirty = true;
        setTimeout(doLogic, 1000 / 60);
    }

    function animate() {
        // update

        // clear
        

        // draw stuff
        if (dirty) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            scene.forEach(function(element) {
                element.draw();
            });
            dirty = false;
        }

        // for (var idx in scene) {
        //     scene[idx].draw();
        // }

        // request new frame
        requestAnimFrame(function() {
            animate();
        });
    }
});
