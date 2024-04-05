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

'use strict';

import {getRuleForDate, getObservationForRule, isoDate, cloneDate} from './easterizer.js';

const locale = {
  en: {
    title: "Easterizer",
    subtitle: "turns any date into a moveable feast like Easter.",
    date: "This date:",
    is: "is",
    observed: "and is observed on:",
    description_template: "the %WEEKDAY_ORDINAL% %WEEKDAY_LABEL% after the %LUNAR_ORDINAL% %LUNAR_LABEL% following the %SOLAR_LABEL%",
    invalid_date: "invalid ☹",
    language: "Language",
    open_source: "Open source",
    weekdays: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    seasons: {
      'spring': 'March equinox',
      'summer': 'June solstice',
      'autumn': 'September equinox',
      'winter': 'December solstice',
    },
    phases: {
      'new': 'New Moon',
      'q1': 'First-Quarter Moon',
      'full': 'Full Moon',
      'q3': 'Last-Quarter Moon',
    },
    ordinals: [
      'first',
      'second',
      'third',
      'fourth',
      'fifth',
      'sixth',
      'seventh',
      'eighth',
      'ninth',
      'tenth',
      'eleventh',
      'twelfth',
    ],
  },
  lt: {
    title: "Velykintuvas",
    subtitle: "paverčia bet kokią datą į kilnojamą šventę kaip Velykos.",
    date: "Ši data:",
    is: "yra",
    observed: "ir yra minima:",
    description_template: "%WEEKDAY_ORDINAL% %WEEKDAY_LABEL% po %LUNAR_ORDINAL% %LUNAR_LABEL% nuo %SOLAR_LABEL%",
    invalid_date: "netinkama ☹",
    language: "Kalba",
    open_source: "Atviras kodas",
    weekdays: [
      'sekmadienis',
      'pirmadienis',
      'antradienis',
      'trečiadienis',
      'ketvirtadienis',
      'penktadienis',
      'šeštadienis',
    ],
    seasons: {
      'spring': 'pavasario lygiadienio',
      'summer': 'vasaros saulėgrįžos',
      'autumn': 'rudens lygiadienio',
      'winter': 'žiemos saulėgrįžos',
    },
    phases: {
      'new': 'jaunaties',
      'q1': 'priešpilnio',
      'full': 'pilnaties',
      'q3': 'delčios',
    },
    ordinals: [
      'pirmos',
      'antros',
      'trečios',
      'ketvirtos',
      'penktos',
      'šeštos',
      'septintos',
      'aštuntos',
      'devintos',
      'dešimtos',
      'vienuoliktos',
      'dvyliktos',
    ],
    weekday_ordinals: [
      'pirmas',
      'antras',
      'trečias',
      'ketvirtas',
    ],
  },
};

locale.en.weekday_ordinals = locale.en.ordinals;

const default_locale = 'en';

const ACTION_CLEAR   =  0;
const ACTION_PREPEND = -1;
const ACTION_APPEND  =  1;

let observation_lock = false;

let lang = document.documentElement.lang || default_locale;

let date_input, date_description, observation_block, observation_list;
let current_date, current_rule;

let debug = false;

function getLocale() {
  return locale[lang];
}

function localeDate(date) {
  return date.toLocaleDateString(
    lang,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
      era: date.getUTCFullYear() <= 0
        ? 'short'
        : undefined,
    }
  );
}

function setLanguage(new_lang) {
  if (!locale[new_lang] || new_lang == lang) return;
  
  lang = new_lang;
  let _locale = getLocale();
  document.querySelectorAll('[data-trans]').forEach(node => {
    node.innerText = _locale[node.getAttribute('data-trans')];
  });
  
  if (current_date) {
    setCurrentDate(current_date, true);
  }

  applyHash(
    'lang',
    new_lang === default_locale
      ? undefined
      : new_lang
  );
}

async function populateObservationList(rule, date, action, count) {
  if (observation_lock) return;
  observation_lock = true;

  if (count === undefined) {
    count = 5;
  }

  if (action === undefined) {
    action = ACTION_CLEAR;
  }
  
  if (action === ACTION_CLEAR) {
    observation_list.innerHTML = '';
  }

  let forward = true;
  if (action === ACTION_PREPEND) {
    forward = false;
  }

  let _date = cloneDate(date);

  while (count) {
    try {
      _date = await getObservationForRule(_date, rule, forward);
    } catch (error) {
      observation_lock = false;
      throw error;
    }
    let item = document.createElement('li');
    
    let iso_date = isoDate(_date);
    if (debug) {
      let _rule_date = new Date(isoDate(_date));
      let _rule = await getRuleForDate(_rule_date);
      let _description = getRuleDescription(_rule);
      item.innerHTML = `<span>${isoDate(_date)} - ${_description}</span>`;
    } else {
      item.innerHTML = `<span title="${iso_date}">${localeDate(_date)}</span>`;
    }
    item.setAttribute('data-date', iso_date);
    
    forward
      ? observation_list.append(item)
      : observation_list.prepend(item);
    count--;
    if (forward) {
      _date.setUTCDate(_date.getUTCDate() + 1);
    } else {
      _date.setUTCFullYear(_date.getUTCFullYear() - 1);
    }
  }

  observation_lock = false;
}

function setCurrentDate(date_string, force) {
  let date = new Date(date_string);
  date.setUTCHours(0, 0, 0, 0);
  if (date == current_date && !force) return;

  date_string = isoDate(date);
  date_input.value = date_string;
  current_date = date;
  displayDateCalculation(date);

  let skip_date_hash = isNaN(date.getTime())
    || date_string === isoDate(new Date);
  applyHash(
    'date',
    skip_date_hash
      ? undefined
      : date_string
  );
}

function getRuleDescription(rule) {
  let weekday_label = getLocale().weekdays[rule.weekday];

  let weekday_ordinal = getLocale().weekday_ordinals[rule.weekday_count - 1];
  weekday_ordinal = `<span title="${rule.weekday_count}">${weekday_ordinal}</span>`;

  let lunar_ordinal = getLocale().ordinals[rule.lunar_dates.length - 1];

  if (lang === 'lt'
    && rule.lunar.reference === 'q1'
  ) {
    lunar_ordinal = lunar_ordinal.replace(/s$/, '');
  }

  let lunar_title = rule.lunar_dates.map(p => localeDate(p)).join(";\n");
  if (debug) {
    lunar_title += "\n" + JSON.stringify(rule.lunar).replace(/"/g, '&quot;');
  }
  let lunar_label = getLocale().phases[rule.lunar.reference];
  lunar_label = `<span class="titled" title="${lunar_title}">${lunar_label}</span>`

  let solar_title = localeDate(rule.solar.date);
  if (debug) {
    solar_title += "\n" + JSON.stringify(rule.solar).replace(/"/g, '&quot;');
  }
  let solar_label = getLocale().seasons[rule.solar.reference];
  solar_label = `<span class="titled" title="${solar_title}">${solar_label}</span>`;

  let description = getLocale().description_template
    .replace('%WEEKDAY_ORDINAL%', weekday_ordinal)
    .replace('%WEEKDAY_LABEL%', weekday_label)
    .replace('%LUNAR_ORDINAL%', lunar_ordinal)
    .replace('%LUNAR_LABEL%', lunar_label)
    .replace('%SOLAR_LABEL%', solar_label);

  return description;
}

async function displayDateCalculation(date) {
  try {
    date_description.innerText = '...';
    observation_block.style.display = 'none';
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    let rule = await getRuleForDate(date);
    let description = getRuleDescription(rule);
    date_description.innerHTML = description;
    current_rule = rule;

    let now = new Date;
    let start_date = new Date(`${now.getFullYear() - 2}-01-01`);
    populateObservationList(rule, start_date, ACTION_CLEAR);
    observation_block.style.display = 'initial';
    observation_block.querySelectorAll('button[disabled]').forEach(element => {
      element.toggleAttribute('disabled', false);
    });
  } catch (error) {
    console.error(error);
    current_date = null;
    current_rule = null;
    date_description.innerHTML = getLocale().invalid_date;
  }
}

function applyHash(key, value) {
  let url = new URL(document.location);
  let hash = url.hash;
  hash = hash.replace(/^#/, '');
  let elements = hash.split(';');
  let map = Object.fromEntries(elements.map(e => e.split(':')));
  map[key] = value;
  let output = [];
  Object.keys(map).forEach(k => {
    let v = map[k];
    if (v === undefined) return;
    output.push(k + ':' + v);
  });
  url.hash = '#' + output.join(';');
  if (url.toString() !== document.location) {
    history.replaceState({}, "", url.toString());
  }
}

function processURL(url) {
  let hash = decodeURIComponent(new URL(url).hash);
  if (!hash) return;
  hash = hash.replace(/^#/, '');
  let elements = hash.split(';');
  elements.forEach(element => {
    let parts = element.split(':');
    if (parts.length < 2) return;
    switch (parts[0]) {
      case "debug":
        debug = !!parts[1];
      break;
      case "lang":
        setLanguage(parts[1]);
      break;
      case "date":
        setCurrentDate(parts[1]);
      break;
    }
  });
}

window.addEventListener('load', async (event) => {
  date_input = document.getElementById('date-input');
  date_description = document.getElementById('date-description');
  observation_block = document.getElementById('observation-block');
  observation_list = document.getElementById('observation-list');

  date_input.addEventListener('change', async (event) => {
    setCurrentDate(date_input.value)
  });

  observation_block.querySelector('.observation-prepend')
    .addEventListener('click', async (event) => {
      const button = event.currentTarget;
      if (!current_rule || button.hasAttribute('disabled')) return;

      let item = observation_list
        .querySelector('li[data-date]:first-of-type');
      if (!item) return;
      
      let start_date = new Date(item.getAttribute('data-date'));
      try {
        await populateObservationList(current_rule, start_date, ACTION_PREPEND);
      } catch (error) {
        console.error(error);
        button.toggleAttribute('disabled', true);
      }
      button.scrollIntoView({block: 'nearest'});
    });

  observation_block.querySelector('.observation-append')
    .addEventListener('click', async (event) => {
      const button = event.currentTarget;
      if (!current_rule || button.hasAttribute('disabled')) return;

      let item = observation_list
        .querySelector('li[data-date]:last-of-type');
      if (!item) return;
      
      let start_date = new Date(item.getAttribute('data-date'));
      try {
        await populateObservationList(current_rule, start_date, ACTION_APPEND);
      } catch (error) {
        console.error(error);
        button.toggleAttribute('disabled', true);
      }
      button.scrollIntoView({block: 'nearest'});
    });

  processURL(document.location);

  window.addEventListener('hashchange', (event) => {
    processURL(document.location);
  });

  if (!current_date) {
    setCurrentDate(isoDate(new Date));
  }
});