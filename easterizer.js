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

'use strict'

import * as lune from './assets/lune.js';
import { getSeasons } from './assets/seasons.js';

const season_order = [
  'spring',
  'summer',
  'autumn',
  'winter',
];

const phase_order = [
  'new',
  'q1',
  'full',
  'q3',
];

function cloneDate(date) {
  return new Date(+date);
}

function isoDate(date) {
  return isNaN(date.getTime())
    ? ''
    : date.toISOString().split('T')[0];
}

function validateYear(year) {
  if (year < -1000 || year > 3000) {
    throw new RangeError("Invalid date");
  }
}

/**
 * Checks for lunar phase transitions between given dates.
 * 
 * @param  {Date} start
 * @param  {Date} end
 * @return {bool}
 */
function hasPhaseBetween(start, end) {
  let phases = lune.phase_hunt(start);
  if (phases['nextnew_date'] < end) {
    return true;
  }
  for (let i=0; i<phase_order.length; i++) {
    let phase = phase_order[i] + '_date';
    let phase_date = phases[phase];
    if (start <= phase_date
      && phase_date <= end
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Finds latest suitable solar event (equinox or solstice).
 * 
 * @param  {Date} date
 * @return {Object}
 */
function findSolarReference(date) {
  const year = date.getFullYear();
  validateYear(year);
  const seasons = getSeasons(year);

  let ref_season, ref_date;

  for (let i=0; i<season_order.length; i++) {
    let season = season_order[i];
    
    if (seasons[i] > date) break;
    
    /**
     * We want a lunar phase change between the solar event
     * and the target date. If the solar event closest to the
     * target date is not followed by a lunar phase change,
     * use the previous solar event as reference.
     */
    if (!hasPhaseBetween(seasons[i], date)) {
      continue;
    }

    ref_season = season;
    ref_date = seasons[i];
  }

  /**
   * Couldn't find suitable solar event this year,
   * so use winter solstice from previous year.
   */
  if (ref_season === undefined) {
    ref_season = 'winter';
    ref_date = getSeasons(date.getUTCFullYear() - 1)[3];
  }

  return {
    reference: ref_season,
    date: ref_date,
  };
}

/**
 * Finds latest suitable lunar phase transition·
 * 
 * @param  {Date} date
 * @return {Object}
 */
function findLunarReference(date) {
  const phases = lune.phase_hunt(date);

  let ref_phase, ref_date;
  
  for (let i=0; i<phase_order.length; i++) {
    let phase = phase_order[i];
    let phase_key = phase + '_date';
    
    if (phases[phase_key] > date) break;
    
    ref_phase = phase;
    ref_date = phases[phase_key];
  }

  /**
   * Couldn't find suitable phase change this cycle,
   * so look at previous cycle.
   */
  if (ref_phase === undefined) {
    let new_date = cloneDate(phases['new_date']);
    new_date.setUTCDate(new_date.getUTCDate() - 1);
    return findLunarReference(new_date);
  }

  return {
    reference: ref_phase,
    date: ref_date,
  };
}

/**
 * Counts occurences of a particular day of week
 * between two dates (start < x <= end).
 * 
 * @param  {Date} start
 * @param  {Date} end
 * @param  {numer}  weekday 0 - 6 (Sunday - Saturday)
 * @return {number}
 */
function weekdayCount(start, end, weekday) {
  let temp = cloneDate(start);
  temp.setUTCHours(0, 0, 0, 0);
  let count = 0;
  while (temp <= end) {
    temp.setUTCDate(temp.getUTCDate() + 1);
    if (temp.getUTCDay() === weekday) {
      count++;
    }
  }
  return count;
}

/**
 * Formulates components needed to describe a given date as an Easter-like moveable feast:
 * "the [weekday_count]th [weekday] after the [lunar_dates.length]th [lunar.reference]
 * following the [solar.reference]".
 * 
 * @params  {Date} date
 * @return  {Object}
 */
async function getRuleForDate(date) {
  let weekday = date.getUTCDay();

  let solar = findSolarReference(date);
  let lunar = findLunarReference(date);

  let weekday_count = weekdayCount(lunar.date, date, weekday);

  let next_date = cloneDate(date);
  next_date.setUTCDate(next_date.getUTCDate() + 1);
  let prev_date = cloneDate(solar.date);
  prev_date.setUTCDate(prev_date.getUTCDate() - 1);
  let lunar_dates = lune.phase_range(
    prev_date,
    next_date,
    phase_order.indexOf(lunar.reference),
  );
  lunar_dates = lunar_dates.filter(p => {
    return p >= solar.date
      && p <= date;
  });

  return {
    solar: solar,
    lunar: lunar,
    lunar_dates: lunar_dates,
    weekday: weekday,
    weekday_count: weekday_count,
  };
}

/**
 * Finds the next date that fits a moveable feast rule from a given start date.
 * 
 * @param  {Date}   date
 * @param  {Object} rule     output of getRuleForDate()
 * @param  {bool}   forward  whether to search forward or backward in time
 * @return {Date}
 */
async function getObservationForRule(date, rule, forward) {
  // Default to forward search
  if (forward === undefined) {
    forward = true;
  }

  // Find date of solar event for reference
  let seasons, temp_date;
  let mult = forward ? 1 : -1;
  let i = 0;
  do {
    seasons = getSeasons(date.getUTCFullYear() + i*mult);
    temp_date = cloneDate(seasons[season_order.indexOf(rule.solar.reference)]);
    i++;
  } while (forward
    ? temp_date < date
    : temp_date > date
  );
  validateYear(temp_date.getUTCFullYear());
  
  // Adjust date for lunar phase
  let interval_end = cloneDate(temp_date);
  interval_end.setUTCMonth(interval_end.getUTCMonth() + rule.lunar_dates.length + 1);
  let prev_day = cloneDate(temp_date);
  prev_day.setUTCDate(prev_day.getUTCDate() - 1);
  let phases = lune.phase_range(
    prev_day,
    interval_end,
    phase_order.indexOf(rule.lunar.reference),
  );
  let lunar_countdown = rule.lunar_dates.length;
  for (let i=0; i<phases.length; i++) {
    let phase_date = cloneDate(phases[i]);
    if (phase_date < temp_date) {
      continue;
    }
    lunar_countdown--;
    if (lunar_countdown == 0) {
      temp_date = phase_date;
      break;
    }
  }

  // Adjust date for weekday
  if (temp_date > new Date(isoDate(temp_date))) {
    temp_date.setUTCDate(temp_date.getUTCDate() + 1);
  }
  let day_diff = rule.weekday - temp_date.getUTCDay();
  if (day_diff < 0) {
    day_diff += 7;
  }
  let week_diff = (rule.weekday_count - 1) * 7;
  temp_date.setUTCDate(temp_date.getUTCDate() + day_diff + week_diff);
  
  if (isoDate(temp_date) == isoDate(date)) {
    // Output date same as input - try again with a different year
    let new_date = cloneDate(date);
    new_date.setUTCFullYear(new_date.getUTCFullYear() + (forward ? 1 : -1));
    return getObservationForRule(new_date, rule, forward);
  }

  return temp_date;
}

export {
    getRuleForDate,
    getObservationForRule,
    findSolarReference,
    findLunarReference,
    isoDate,
    cloneDate,
};
