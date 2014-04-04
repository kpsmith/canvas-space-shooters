// boilerplate
window.requestAnimFrame = (function(callback) {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
    };
})();

$(document).ready(function() {
    var canvas = document.getElementById('drawArea');
    canvas.height = $(window).height();
    canvas.width = $(window).width();
    $("#drawArea").css("width", $(window).width());
    $("#drawArea").css("height", $(window).height());
    var context = canvas.getContext('2d');
    var players = [];

    function init() {
        players.push(player(0, canvas.height / 2, 20, 'blue', 7, 0));
        players.push(player(0, canvas.height / 3, 20, 'yellow', 2, 1));
        players.push(player(0, canvas.height / 4, 20, 'red', 3, 1));
        players.push(player(0, canvas.height / 5, 20, 'green', 4, 1));
        players.push(player(0, canvas.height / 6, 20, 'purple', 5, 1));
        players.push(player(0, canvas.height / 7, 20, 'orange', 6, 1));
        animate();
        doLogic();
    }
    init();

    function player(x, y, r, color, vel, id) {
        return {
            id: id,
            x: x,
            y: y,
            r: r,
            color: color,
            dir: 1,
            yDir:1,
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
                if (this.id == 0) {
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
                } else {
                    var targetPlayer = players[0];
                    var deltaX = targetPlayer.x - this.x;
                    var deltaY = targetPlayer.y - this.y;

                    var factor = this.vel / Math.sqrt(Math.pow(deltaX,2) + Math.pow(deltaY,2) );
                    this.x += factor * deltaX;
                    this.y += factor * deltaY;
                }
            }
        };
    }

    function follow() {


    }

    function doLogic() {
        for (var idx in players) {
            players[idx].think();
        }
        setTimeout(doLogic, 1000 / 200);
    }

    function animate() {
        // update

        // clear
        context.clearRect(0, 0, canvas.width, canvas.height);

        // draw stuff
        for (var idx in players) {
            players[idx].draw();
        }

        // request new frame
        requestAnimFrame(function() {
            animate();
        });
    }
});