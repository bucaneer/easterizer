/**
 * Copyright 2024 Justas Lavišius <bucaneer@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Calculates Julian Day number from a given date.
 * Based on "Astronomical Algorithms", 2nd ed., by Jean Meeus, p. 60-61
 * 
 * @param  {Date} date
 * @return {number}
 */
function dateToJulianDay (date) {
  let Y = date.getUTCFullYear();
  let M = date.getUTCMonth() + 1;
  let D = date.getUTCDate();
  let h = date.getUTCHours();
  let min = date.getUTCMinutes();
  let s = date.getUTCSeconds();
  let ms = date.getUTCMilliseconds();
  
  D += h / 24.0 + min / 1440.0 + s / 86400.0 + ms / 86400000.0;

  let y, m, a, b;

  if (M <= 2) {
    m = M + 12;
    y = Y - 1;
  } else {
    m = M;
    y = Y;
  }

  if (Y > 1582 ||
    (Y == 1582 && M > 10) ||
    (Y == 1582 && M == 10 && D >= 15)
  ) {
    a = Math.trunc(y / 100);
    b = 2 - a + Math.trunc(a / 4);
  } else {
    b = 0;
  }

  return Math.trunc(365.25 * (y + 4716)) +
    Math.trunc(30.6001 * (m + 1)) + D + b - 1524.5;
}

export {
    dateToJulianDay,
}
