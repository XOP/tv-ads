/**
 * Application
 *
 */

var utils = require('utils');

var slides = utils.findAll('.slide');
var count = 0;

// todo: require css module
var animDur = 1500; // corresponds with CSS var

// todo: config
var slideDur = 12000;

var DEVELOPMENT = false;

if(DEVELOPMENT) {
    utils.find('.main_back').style.display = "none";

    var button = utils.find('#rotate');
    button.style.display = "block";
    button.addEventListener('click', changeSlide);
} else {
    setInterval(changeSlide, slideDur);
}

/**
 * Main slide changing func
 */
function changeSlide() {
    var current = slides[count];
    var next = slides[++count] || slides[count = 0];

    current.classList.toggle('__active');
    setTimeout(function(){
        current.classList.toggle('__active');
        current.classList.toggle('__hidden');
    }, animDur);

    next.classList.toggle('__hidden');
}