/**
 * MIT License
 * 
 * Copyright (c) 2023 Postlight
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
 * Gets the start date and time for the Astronomical season's start
 * The next nearest solstice/equinox is returned if the month index doesn't have one
 * The month index begins at 0, so January=0, February=1, and so on
 *
 * Which season each equinox or solstice represents the start of depends on your hemisphere
 *
 * Below calculations from Astronomical Algorithms, p.177-182
 */
export function getSeasonStart(monthIndex, year) {
    const jde = getSeasonStartJulianDay(monthIndex, year);
    return getDateFromJulianDay(jde);
}
export function getSeasonStartJulianDay(monthIndex, year) {
    const jde0 = getJDE0(monthIndex, year);
    const t = (jde0 - 2451545) / 36525;
    let w = 35999.373 * t - 2.47;
    w = w * (Math.PI / 180); // convert degrees to radians
    const deltaLambda = 1 + 0.0334 * Math.cos(w) + 0.0007 * Math.cos(w * 2);
    const s = calculateS(t);
    const jde = jde0 + (0.00001 * s) / deltaLambda;
    return Math.round(jde * 100000) / 100000;
}
function getJDE0(monthIndex, year) {
    // Astronomical Algorithms, p.178, Table 27.A
    const seasonConstantsA = [
        [1721139.29189, 365242.1374, 0.06134, 0.00111, -0.00071],
        [1721233.25401, 365241.72562, -0.05323, 0.00907, 0.00025],
        [1721325.70455, 365242.49558, -0.11677, -0.00297, 0.00074],
        [1721414.39987, 365242.88257, -0.00769, -0.00933, -0.00006],
    ];
    // Astronomical Algorithms, p.178, Table 27.B
    const seasonConstantsB = [
        [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
        [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003],
        [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
        [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032],
    ];
    let y, constants;
    if (year >= 1000) {
        y = (year - 2000) / 1000;
        constants = seasonConstantsB[Math.floor(monthIndex / 3)];
    }
    else {
        y = year / 1000;
        constants = seasonConstantsA[Math.floor(monthIndex / 3)];
    }
    return (constants[0] +
        constants[1] * y +
        constants[2] * Math.pow(y, 2) +
        constants[3] * Math.pow(y, 3) +
        constants[4] * Math.pow(y, 4));
}
function calculateS(t) {
    // Astronomical Algorithms, p.179, Table 27.C
    const periodicTermsTable = [
        [485, 324.96, 1934.136],
        [203, 337.23, 32964.467],
        [199, 342.08, 20.186],
        [182, 27.85, 445267.112],
        [156, 73.14, 45036.886],
        [136, 171.52, 22518.443],
        [77, 222.54, 65928.934],
        [74, 296.72, 3034.906],
        [70, 243.58, 9037.513],
        [58, 119.81, 33718.147],
        [52, 297.17, 150.678],
        [50, 21.02, 2281.226],
        [45, 247.54, 29929.562],
        [44, 325.15, 31555.956],
        [29, 60.93, 4443.417],
        [18, 155.12, 67555.328],
        [17, 288.79, 4562.452],
        [16, 198.04, 62894.029],
        [14, 199.76, 31436.921],
        [12, 95.39, 14577.848],
        [12, 287.11, 31931.756],
        [12, 320.81, 34777.259],
        [9, 227.73, 1222.114],
        [8, 15.45, 16859.074],
    ];
    return periodicTermsTable.reduce((acc, line) => acc + line[0] * Math.cos((Math.PI / 180) * (line[1] + line[2] * t)), 0);
}
/*
 * Gets current season of date passed in
 * Converts season start date to user's local timezone to check for correct date
 */
export function getCurrentSeason(date, isNorthernHemisphere = true) {
    const northernHemisphereSeasons = ["winter", "spring", "summer", "fall"];
    const southernHemisphereSeasons = ["summer", "fall", "winter", "spring"];
    const seasons = isNorthernHemisphere
        ? northernHemisphereSeasons
        : southernHemisphereSeasons;
    let seasonIndex = Math.floor(date.getMonth() / 3);
    // Check for season start only in the second half of months with a solstice/equinox
    if ((date.getMonth() + 1) % 3 === 0 && date.getDate() > 14) {
        const utcSeasonStart = getSeasonStart(date.getMonth(), date.getFullYear());
        // Account for timezone in season start - can change date, ex: December solstice 2023
        const localStart = new Date(utcSeasonStart.getFullYear(), utcSeasonStart.getMonth(), utcSeasonStart.getDate());
        if (localStart.getDate() <= date.getDate()) {
            seasonIndex += 1;
            if (seasonIndex > 3) {
                seasonIndex = seasonIndex - 4;
            }
        }
    }
    return seasons[seasonIndex];
}
/**
 * Gets a list of all the seasons in a given year
 * Returns each season as a UTC date in order March to December
 *   [march-equinox, june-solstice, september-equinox, december-solstice]
 */
export function getSeasons(year) {
    return [2, 5, 8, 11].map((monthIndex) => {
        return getSeasonStart(monthIndex, year);
    });
}
/*
 * Convert Julian day into Gregorian Calendar UTC time
 *
 * Calculation from Astronomical Algorithms, p.63
 */
export function getDateFromJulianDay(julianDay) {
    julianDay += 0.5;
    const [sInteger, sFraction] = julianDay.toString().split(".");
    const integer = parseInt(sInteger);
    const fraction = parseFloat("0." + sFraction);
    let a;
    if (integer < 2299161) {
        a = integer;
    }
    else {
        const gamma = Math.trunc((integer - 1867216.25) / 36524.25);
        a = integer + 1 + gamma - Math.trunc(gamma / 4);
    }
    const b = a + 1524;
    const c = Math.trunc((b - 122.1) / 365.25);
    const d = Math.trunc(365.25 * c);
    const e = Math.trunc((b - d) / 30.6001);
    const dayOfMonth = b - d - Math.trunc(30.6001 * e) + fraction;
    const month = e < 14 ? e - 1 : e - 13;
    const hour = (dayOfMonth % 1) * 24;
    const minute = (hour % 1) * 60;
    const [second, millisecond] = (Math.round((minute % 1) * 60 * 10) / 10)
        .toString()
        .split(".");
    const y = month > 2 ? c - 4716 : c - 4715;
    // Need to wrap in UTC or converts from UTC to local
    const date = new Date(Date.UTC(y, month - 1, Math.trunc(dayOfMonth), Math.trunc(hour), Math.trunc(minute), parseInt(second), parseInt(millisecond) * 100 || 0));
    if (y < 100 && y >= 0) {
        date.setUTCFullYear(y);
    }
    return date;
}

export default { getSeasonStart, getCurrentSeason, getSeasons, getDateFromJulianDay };
