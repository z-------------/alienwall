/*
The MIT License (MIT)

Copyright (c) 2014 Zack Guard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";

var HRTime = function(then, options) {
    
    var SECOND = 1000,
        MINUTE = SECOND * 60,
        HOUR = MINUTE * 60,
        DAY = HOUR * 24,
        MONTH = DAY * 30.583, // mean month length
        YEAR = MONTH * 12,
        DECADE = YEAR * 10,
        CENTURY = YEAR * 100,
        MILLENIUM = YEAR * 1000;
    
    var now = new Date();
    var roundFunc = Math.round;
    
    if (options) {
        if (options.now) now = options.now;
        if (options.roundDown) roundFunc = Math.floor;
    }
    
    if (!(then.constructor === Date && now.constructor === Date)) {
        return false;
    }
    
    var d = now.getTime() - then.getTime();
    var delta = Math.abs(d);
    
    var times = {
        millisecond: roundFunc(delta),
        second: roundFunc(delta / SECOND),
        minute: roundFunc(delta / MINUTE),
        hour: roundFunc(delta / HOUR),
        day: roundFunc(delta / DAY),
        month: roundFunc(delta / MONTH),
        year: roundFunc(delta / YEAR),
        decade: roundFunc(delta / DECADE),
        century: roundFunc(delta / CENTURY),
        millenium: roundFunc(delta / MILLENIUM)
    };

    var timesKeys = Object.keys(times);

    var returnVal = {
        time: times.millisecond,
        unit: "millisecond",
        future: false
    };

    timesKeys.forEach(function(key){
        if (times[key] < returnVal.time && times[key] > 0) {
            returnVal.time = times[key];
            returnVal.unit = key;
        }
    });
    
    if (d < 0) returnVal.future = true;

    return returnVal;
};