const remote = require('electron').remote;

const fs = require('fs');

const pages = ['main-page', 'help-page', 'settings-page', 'credits-page'];
var lastPage = 'main-page';

function saveSettings() {
  fs.writeFile('timer-settings.json', JSON.stringify(exports.settings), 'utf8', (err) => {});
}

try {
  exports.settings = JSON.parse(fs.readFileSync('timer-settings.json', 'utf8'));
} catch(err) {
  exports.settings = {
    'event': 'policy',
    'timerHasColor': false,
    'useKeyboardShortcuts': true
  };
  saveSettings();
}

function showPage(pageName, button) {
  if (lastPage == 'settings-page') {
    exports.settings = {
      'event': $("#setting-debate-event-selector option:selected").attr('value'),
      'timerHasColor': $("#setting-colored-timer").prop("checked"),
      'useKeyboardShortcuts': $("#setting-shortcuts").prop("checked")
    }
    saveSettings();
  }

  $("#" + lastPage).fadeOut(100);
  window.setTimeout(function() {
    $("#" + pageName).fadeIn(100);
    if (pageName == 'settings-page') {
      $("#setting-colored-timer").prop('checked', exports.settings.timerHasColor);
      $("#setting-debate-event-selector option[value='" + exports.settings.event + "']")
        .attr('selected', '');
      $("#setting-shortcuts").prop('checked', exports.settings.useKeyboardShortcuts);
    }
  }, 150);
  lastPage = pageName;

  toggleActionMenu();
}

function toggleActionMenu() {
  $(".action-menu-togglable").toggle(150);

  if ($("#toggle-action-menu").html() == '<i class="fas fa-times"></i>') {
    window.setTimeout(function() {
      $("#toggle-action-menu").html('<i class="fas fa-ellipsis-h"></i>');
    }, 125);
  } else {
    $("#toggle-action-menu").html('<i class="fas fa-times"></i>');
  }
}

$(document).ready(function() {
  pages.forEach(function(page) { if (page != lastPage) $("#" + page).hide(0); });
  $('#' + lastPage).show(0);

  $(".action-menu-togglable").hide(0);
  $("#toggle-action-menu").click(toggleActionMenu);

  $("#close-window-btn").click(function() { remote.getCurrentWindow().close(); });
  $("#min-window-btn").click(function() { remote.getCurrentWindow().minimize(); });
});
