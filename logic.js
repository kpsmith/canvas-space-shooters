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

    var maxParticles = 10000;
    // var particles = [];
    // var particleIdx = 0;
    var dirty = false;
    var curPerfBucketStart = undefined;
    var ticks = 0;
    var storedDistances = {};
    var widthWanted = $(window).width();
    var heightWanted = $(window).height();

    function resizeCanvas() {
        widthWanted = $(window).width();
        heightWanted = $(window).height();
        dirty = true;

        $("#drawArea").css("width", widthWanted);
        $("#drawArea").css("height", heightWanted);
    }
    $(window).resize(resizeCanvas);

    function Player(id, color) {
        this.id = id;
        this.x = canvas.width * Math.random();
        this.y = canvas.height * Math.random();
        this.r = 20;
        this.color = color;
        this.xDir = Math.round(Math.random()) * 2 - 1;
        this.yDir = Math.round(Math.random()) * 2 - 1;
        this.vel = Math.random() + .5;
        this.maxCooldown = 60;
        this.cooldown = Math.floor(Math.random() * this.maxCooldown);
        this.maxRange = Math.max(canvas.height, canvas.width);
        this.health = 100;
    }
    Player.prototype.shieldWidth = function() {
        return this.health / 5;
    }
    Player.prototype.effectiveRadius = function() {
        return this.r + this.shieldWidth();
    }
    Player.prototype.draw = function() {
        // circle
        context.beginPath();
        context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
        // stroke (shield)
        context.lineWidth = this.shieldWidth() * 2;
        context.strokeStyle = 'hsla(189, 86%, 51%, 0.5)';
        context.stroke();
        // fill
        context.fillStyle = this.color;
        context.fill();
    }
    Player.prototype.think = function() {
        // death
        if (this.health < 0) {
            scene.add(new PlayerDeath(this));
            sceneDelete(this);
            playersDelete(this);
            return;
        }
        // movement
        this.x += this.xDir * this.vel;
        if (this.x + this.effectiveRadius() > canvas.width) {
            this.xDir = -1;
        }
        if (this.x - this.effectiveRadius() < 0) {
            this.xDir = 1;
        }
        this.y += this.yDir * this.vel;
        if (this.y + this.effectiveRadius() > canvas.height) {
            this.yDir = -1;
        }
        if (this.y - this.effectiveRadius() < 0) {
            this.yDir = 1;
        }
        // combat
        this.cooldown -= 1;
        if (this.cooldown < 0 && players.size > 1) {
            // targetting
            var closestDist = Infinity;
            var closestTarget = undefined;
            players.forEach(function(target) {
                if (target !== this) {
                    var targetDist = distance(this, target);
                    if (targetDist < closestDist && targetDist < this.maxRange) {
                        closestDist = targetDist;
                        closestTarget = target;
                    }
                }
            }.bind(this));
            // attack!
            if (closestTarget !== undefined) {
                this.fire(closestTarget);
                this.cooldown = this.maxCooldown;
            }
        }
    }

    Player.prototype.fire = function(targetPlayer) {
        var startX;
        if (targetPlayer.x > this.x) {
            startX = this.x + this.r;
        } else {
            startX = this.x - this.r;
        }
        var startY;
        if (targetPlayer.y > this.y) {
            startY = this.y + this.r;
        } else {
            startY = this.y - this.r;
        }
        scene.add(new Projectile(startX, startY, targetPlayer));
    }

    function Projectile(x, y, targetPlayer) {
        this.x = x;
        this.y = y;
        this.r = 4;
        this.color = 'yellow';
        this.dir = 1;
        this.yDir = 1;
        this.vel = 5;
        this.target = targetPlayer;
    }
    Projectile.prototype.draw = function() {
        context.beginPath();
        context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
        context.fillStyle = '#eea';
        context.shadowBlur = this.r;
        context.shadowColor = "red";
        context.fill();
        context.shadowBlur = 0;
    }
    Projectile.prototype.think = function() {
        var deltaX = this.target.x - this.x;
        var deltaY = this.target.y - this.y;
        if (this.target.health < 0 ) {
            sceneDelete(this);
            return;
        }
        if (Math.abs(deltaX) < this.target.effectiveRadius() + this.r && Math.abs(deltaY) < this.target.effectiveRadius() + this.r) {
            projectileHit(this.x, this.y);
            this.target.health -= randFloat(5,10);
            sceneDelete(this);
            return;
        }
        var factor = this.vel / Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
        this.x += factor * deltaX;
        this.y += factor * deltaY;
    }



    function Particle(x, y, xVel, yVel, scaleSpeed, r, color, delay) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.color = color;
        this.xVel = xVel;
        this.yVel = yVel;
        this.scaleSpeed = scaleSpeed;
        this.delay = delay;
        this.aliveTicks = 0;
    }
    Particle.prototype.draw = function() {
        if (this.aliveTicks > this.delay) {
            context.beginPath();
            context.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
            context.fillStyle = this.color;
            context.fill();
        }
    }
    Particle.prototype.think = function() {
        // move
        this.x += this.xVel;
        this.y += this.yVel;
        // shrink
        // if (this.aliveTicks > this.delay) {
        //     this.r -= this.scaleSpeed;
        // }
        this.r -= this.scaleSpeed;
        if (this.r < 0) {
            sceneDelete(this);
        }
        this.aliveTicks += 1;
    }

    function PlayerDeath(player) {
        this.maxTTL = 10;
        this.ttl = this.maxTTL;
        this.player = player;
        this.r = 10;
    }
    PlayerDeath.prototype.think = function() {
        // pass
        this.ttl -= 1;
        if ( this.ttl < 0 ) {
            sceneDelete(this);
        }
        if ( this.ttl % 1 === 0 ) {
            boom(this.player.x + randFloat(0,50), this.player.y + randFloat(0, 50));
        }
    }
    PlayerDeath.prototype.draw = function() {}

    function WinBanner(player) {
        this.player = player;
    }
    WinBanner.prototype.think = function() {}
    WinBanner.prototype.draw = function() {
        context.font = "100px Fugaz One";
        context.fillStyle = '#fbfcf7';
        context.lineWidth = 4;
        context.strokeStyle = '#000000';
        context.fillText("Winner!", this.player.x - 200, this.player.y - 40);
        context.strokeText("Winner!", this.player.x - 200, this.player.y - 40);
    }

    function projectileHit(x, y) {
        if (scene.size < maxParticles) {
            expl(x, y, "#ff0", .5);
        }
    }

    function boom(x, y) {
        if (scene.size < maxParticles) {
            var col1 = "#525252";
            // col1 = "#EB871C";
            expl(x, y, col1, 2);
                        expl(x, y, "#EB871C", 1.5);

            expl(x, y, "#FFA318", 1);
        }
    }

    function expl(x, y, color, scale) {
        var minSize = 5 * scale;
        var maxSize = 15 * scale;
        var count = 10;
        var minSpeed = 2;
        var maxSpeed = 5;
        var minScaleSpeed = 0.4 * scale;
        var maxScaleSpeed = 2 * scale;
        var biasX = (Math.random() - 0.5) * 2;
        var biasY = (Math.random() - 0.5) * 2;
        var maxDelay = 10;
        for (var angle = 0; angle < 360; angle += Math.round(360 / count)) {
            var speed = randFloat(minSpeed, maxSpeed);
            var xVel = speed * Math.cos(angle * Math.PI / 180.0) + biasX;
            var yVel = speed * Math.sin(angle * Math.PI / 180.0) + biasY;
            var scaleSpeed = randFloat(minScaleSpeed, maxScaleSpeed);
            var radius = randFloat(minSize, maxSize);
            var delay = randFloat(0, maxDelay);
            scene.add(new Particle(x, y, xVel, yVel, scaleSpeed, radius, color, delay));
        }
    }

    function playersDelete(obj) {
        players.delete(obj);
    }

    function sceneDelete(obj) {
        scene.delete(obj);
    }

    function distance(objA, objB) {
        return Math.sqrt(Math.pow((objA.x - objB.x), 2) + Math.pow((objA.y - objB.y), 2));
    }

    function dist(objA, objB) {
        return Math.sqrt(Math.pow((objA.x - objB.x), 2) + Math.pow((objA.y - objB.y), 2));
    }

    function randFloat(min, max) {
        return min + Math.random() * (max - min);
    }

    var haveDisplayedWinBanner = false;
    function doLogic() {
        var tickStart = Date.now();
        if (!document.hidden && !dirty) {
            scene.forEach(function(element) {
                element.think();
            });
            if (players.size == 1 && !haveDisplayedWinBanner) {
                players.forEach(function(player) {
                    player.health = 100;
                    scene.add(new WinBanner(player));
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
        }

        var elapsed = Date.now() - tickStart;
        dirty = true;
        setTimeout(doLogic, (1000 / 60) - elapsed);
    }

    function animate() {
        // draw stuff
        if (dirty && !document.hidden) {
            if (canvas.width !== widthWanted || canvas.height !== heightWanted) {
                canvas.width = widthWanted;
                canvas.height = heightWanted;
            }
            context.clearRect(0, 0, canvas.width, canvas.height);
            scene.forEach(function(element) {
                element.draw();
            });
            dirty = false;
        }
        // request new frame
        requestAnimFrame(function() {
            animate();
        });
    }

    // Init
    (function() {
        resizeCanvas();
        canvas.width = widthWanted;
        canvas.height = heightWanted;
        var numPlayers = 100;
        for (var i = 0; i < numPlayers; i++) {
            var hue = i % 256;
            if (numPlayers < 255) {
                hue = hue * (255 / numPlayers);
            }
            var color = 'hsl(' + hue + ', 80%, 60%)';
            players.add(new Player(i, color));
        }
        players.forEach(function(player) {
            scene.add(player);
        })
        animate();
        doLogic();
    })();
});
