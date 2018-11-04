const {ipcRenderer} = require('electron');

//Whether the timer is currently ticking
var timerRunning = false;

var timerTimeoutFunction = null;  //Used to pause/resume the timer

var queuedActiveTimer = null; //Timer queued to be put into place once the user confirms
var activeTimer = null;       //The current timer ticking

class Timer {
  constructor(name, shortName, key, timeLeft, btnSize, btnId) {
    this.name = name;
    this.shortName = shortName;
    this.timeLeft = timeLeft;
    this.maxTime = timeLeft;
    this.key = key;
    this.keyCode = key.charCodeAt(0);

    if (this.name.includes('Prep')) {
      if (this.name.includes('Aff') || this.name.includes('Pro'))
        this.btnTag = 'btn-info';
      else if (this.name.includes('Neg') || this.name.includes('Con'))
        this.btnTag = 'btn-dark';
    } else {
        this.btnTag = 'btn-light';
    }
    this.colTag = 'col-' + btnSize;
    this.btnId = btnId;
  }

  generateButtonHTML() {
    return '<div class="' + this.colTag + '">' +
              '<button type="button" id="' + this.btnId + '" ' +
                (exports.settings.useKeyboardShortcuts ? ('data-toggle="tooltip" data-placement="top" title="Shift+' + this.key + '"') : '')  +
                ' class="select-timer custom-font timer-btn btn ' + this.btnTag + '">' + this.shortName + "</button></div>";
  }

  generateButtonAction() {
    //Create a wrapper around this Timer object so that we can pass it to "showTimerConfirmation()"
    var self = this;
    $("#" + this.btnId).click(function() { showTimerConfirmation(self); });
  }

  resetTime(forced) { //Returns the time to be used when a new timer is starting
    if (!this.name.includes('Prep') || forced)
      this.timeLeft = this.maxTime;
  }

  getTime() {
    return this.name.includes('Prep') ? this.timeLeft : this.maxTime;
  }
}

class TimerRow {

  constructor(timers) {
    this.timers = timers;
  }

  generateHTML() {
    var html = '<div class="row no-gutters">';
    this.timers.forEach(function(timer) {
      html += timer.generateButtonHTML();
    })
    html += "</div>";
    return html;
  }

  generateClickAction() {
    this.timers.forEach(function(timer) {
      timer.generateButtonAction();
    });
  }
}

class DebateEvent {
  constructor(name, timers, prepTimers) {
    this.name = name;
    this.normalTimerRow = new TimerRow(timers);
    this.prepTimerRow = new TimerRow(prepTimers);
  }

  isCustomEvent() {
    return this.name.includes('Custom');
  }

  generateTimerSelectorHTML() {
    if (this.isCustomEvent()) {
      return '<div style="col-1"><input type="number" value="0"></div><div style="col-1"></div>' +
            '<div style="col-2"><input type="number" value="0"></div>';
    } else {
      return '<div>' + this.normalTimerRow.generateHTML() + this.prepTimerRow.generateHTML() + '</div>';
    }
  }

  generateClickAction() {
    this.normalTimerRow.generateClickAction();
    this.prepTimerRow.generateClickAction();
  }

  showTimerSelector() {
    $("#default-bottom-section").hide(0);
    $("#bottom-row").hide(0);
    $("#timer-confirmation-row").hide(0);
    $("#timer-selection-row").html(this.generateTimerSelectorHTML());
    $("#timer-selection-row").fadeIn(150);
    this.generateClickAction();
  }
}

const debateEvents = {
  policy: new DebateEvent(
    'Policy',
    [
      new Timer('Constructive', 'Cstr.', 'C', 8*60, 4, 'new-constructive'),
      new Timer('Rebuttal', 'Rbtl.', 'R', 5*60, 4, 'new-rebuttal'),
      new Timer('Cross-Examination', 'CX', 'X', 3*60, 4, 'new-cx')
    ],
    [
      new Timer('Aff Prep Time', 'Aff Prep', 'A', 8*60, 6, 'aff-prep'),
      new Timer('Neg Prep Time', 'Neg Prep', 'N', 8*60, 6, 'neg-prep')
    ]
  ),
  ld: new DebateEvent(
    'Lincoln-Douglas',
    [
      new Timer('1AC, 1AR, & 1NR', '1AC & Rbtls.', 'R', 6*60, 6, 'new-acr'),
      new Timer('1NC', '1NC', 'C', 7*60, 3, 'new-rebuttal'),
      new Timer('Cross-Examination', 'CX', 'X', 3*60, 3, 'new-cx')
    ],
    [
      new Timer('Aff Prep Time', 'Aff Prep', 'A', 4*60, 6, 'aff-prep'),
      new Timer('Neg Prep Time', 'Neg Prep', 'N', 4*60, 6, 'neg-prep')
    ]
  ),
  pf: new DebateEvent(
    'Public Forum',
    [
      new Timer('Constructive', 'Cstr.', 'C', 4*60, 4, 'new-constructive'),
      new Timer('Summary & Final Focus', 'Sum. & FF', 'S', 2*60, 5, 'new-sumff'),
      new Timer('Crossfire', 'CF', 'F', 3*60, 3, 'new-cf')
    ],
    [
      new Timer('Pro Prep Time', 'Pro Prep', 'A', 2*60, 6, 'pro-prep'),
      new Timer('Con Prep Time', 'Con Prep', 'N', 2*60, 6, 'con-prep')
    ]
  ),
  cpolicy: new DebateEvent(
    'College Policy',
    [
      new Timer('Constructive', 'Cstr.', 'C', 9*60, 4, 'new-constructive'),
      new Timer('Rebuttal', 'Rbtl.', 'R', 5*60, 4, 'new-rebuttal'),
      new Timer('Cross-Examination', 'CX', 'X', 3*60, 4, 'new-cx')
    ],
    [
      new Timer('Aff Prep Time', 'Aff Prep', 'A', 10*60, 6, 'aff-prep'),
      new Timer('Neg Prep Time', 'Neg Prep', 'N', 10*60, 6, 'neg-prep')
    ]
  ),
  custom: new DebateEvent(
    'Custom',
    [],
    []
  )
};
var currentEvent = debateEvents['policy'];

function formatTime(seconds) {
  var sec = (seconds % 60).toString();
  return Math.floor(seconds/60) + ':' + (sec.length == 1 ? '0' : '') + sec;
}

function showTimerConfirmation(timer) {
  var speechName = timer.name;
  var speechTime = timer.getTime();
  nextSpeechStartTime = speechTime;
  $('#timer-confirmation-row #speech-time').html(formatTime(speechTime));
  $('#timer-confirmation-row #speech-name').html(speechName);

  $("#timer-selection-row").hide(0);
  $("#timer-confirmation-row").fadeIn(250);
  $("#bottom-row").fadeIn(100);
  $("#pause-timer").removeClass('disabled');
  if (!timerRunning)
    $("#pause-timer").html('<i class="fas fa-play"></i>')

  queuedActiveTimer = timer;
}

function toggleTimer(updateIcon) {
  if (timerRunning) {
    window.clearInterval(timerTimeoutFunction);
    timerRunning = false;
    if (updateIcon)
      $("#pause-timer").html('<i class="fas fa-play"></i>');
  } else {
    timerTimeoutFunction = window.setInterval(timerPerSecondFunction, 1000);
    timerRunning = true;
    if (updateIcon)
      $("#pause-timer").html('<i class="fas fa-pause"></i>');
  }
}

function onPauseBtnClicked() {
  if (
    !timerRunning &&
    $('#timer-confirmation-row').is(':visible') &&
    (activeTimer == null || activeTimer.timeLeft == 0)
  ) {
    startSpeech();
  } else {
    if (!$('#pause-timer').hasClass('disabled'))
      toggleTimer(true);
  }
}

ipcRenderer.on('keyboard-shortcut', function(event, shortcut) {
  switch (shortcut) {
    case 'pause-resume':
      onPauseBtnClicked();
      break;
  }
});

function calculateColor(time, maxTime, counter) {
  if (exports.settings.timerHasColor) {
    var percent = time/maxTime;
    if (percent >= 0.9) return '#000000';
    if (percent >= 0.8) return '#1F0000';
    if (percent >= 0.7) return '#3F0000';
    if (percent >= 0.6) return '#5F0000';
    if (percent >= 0.5) return '#7F0000';
    if (percent >= 0.4) return '#9F0000';
    if (percent >= 0.3) return '#BF0000';
    if (percent >= 0.2) return '#CF0000';
    if (percent >= 0.1) return '#FF0000';
    const colors = ['#440000', '#FF0000'];
    return colors[counter%2];
  } else {
    return '#000000';
  }
}

function startTimer() {
  if (timerRunning)
    toggleTimer(false);
  $("#pause-timer").html('<i class="fas fa-pause"></i>');
  $("#pause-timer").removeClass('disabled');

  timerRunning = true;

  activeTimer = queuedActiveTimer;
  activeTimer.resetTime(false);
  timerTimeoutFunction = window.setInterval(timerPerSecondFunction, 1000);
}

function timerPerSecondFunction() {
  if (activeTimer.timeLeft >= 0) {
    if (activeTimer.timeLeft > 0)
      activeTimer.timeLeft--;
    $("#timer").html(formatTime(activeTimer.timeLeft));
  }

  $("#timer").css('color', calculateColor(activeTimer.timeLeft, activeTimer.maxTime, activeTimer.maxTime-activeTimer.timeLeft));

  if (activeTimer.timeLeft == 0) {
    $("#pause-timer").addClass('disabled');
    toggleTimer(false);
  }
}

function toggleTimerSelector() {
  if ($("#timer-selection-row").is(':visible')) {
    $("#timer-selection-row").slideUp(100, function() {
      $("#default-bottom-section").show(0);
      $("#bottom-row").fadeIn(50);
    });

  } else {
    currentEvent = debateEvents[exports.settings.event];

    currentEvent.showTimerSelector();
  }
}

function startSpeech() {
  $('#timer-selection-row').hide(0);
  $('#timer-confirmation-row').hide(0);
  $("#default-bottom-section").fadeIn(250);
  $("#default-bottom-section #name").html($('#speech-name').html());
  $("#timer").html($('#speech-time').html());
  startTimer();
}

$(document).ready(function() {

  $('#timer-confirmation-row').hide(0);
  $('#timer-selection-row').hide(0);

  $('#start-speech').click(startSpeech);

  $('#new-timer').click(toggleTimerSelector);
  $('#pause-timer').click(onPauseBtnClicked);

  $('body').keypress(function(event) {
    if ($('#main-page').is(':visible') && exports.settings.useKeyboardShortcuts) {
      if (event.key == ' ') {
        onPauseBtnClicked();
      } else if (event.shiftKey) {
        console.log(event.keyCode);
        var allTimerRows = [currentEvent.prepTimerRow, currentEvent.normalTimerRow];

        allTimerRows.forEach(function(timerRow) {
          timerRow.timers.forEach(function(timer) {
            if (timer.keyCode == event.keyCode) {
              var speechTime = timer.getTime();
              nextSpeechStartTime = speechTime;
              $('#timer-confirmation-row #speech-time').html(formatTime(speechTime));
              $('#timer-confirmation-row #speech-name').html(timer.name);

              $("#timer-selection-row").hide(0);
              $("#timer-confirmation-row").hide(0);
              $("#bottom-row").fadeIn(100);
              $("#pause-timer").removeClass('disabled');
              if (!timerRunning)
                $("#pause-timer").html('<i class="fas fa-play"></i>')

              queuedActiveTimer = timer;
              startSpeech();
            }
          });
        });
      }
    }
  });
});
