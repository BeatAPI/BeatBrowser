import './ui-language.js';
// [INPUT] Existing TaskSpace states and explicit pause reasons.
// [OUTPUT] Human-readable workspace labels without inferring who caused focus.
// [POS] Shared popup/sidebar copy. [PROTOCOL] No state or permission changes.
export function taskPresentation(space, locale = 'en') {
  const labels = {recovered:'Ready to restore',opening:'Starting',running:'Running',user:'Paused',interrupted:'Disconnected',expired:'Session expired',stopped:'Stopped',finished:'Completed'};
  const reasons = {
    reload:'Restored. Check pages before continuing.',
    'page-closed':'A task page was closed.',
    'window-focused':'Window focused. Review before continuing.',
    'review-requested':'Review requested.',
    handoff:'You have control',
    'page-moved':'Page moved. Check before continuing.',
    'popup-outside':'External popup. Check before continuing.',
    'control-unavailable':'Background control unavailable.',
    interrupted:'Control lost. Check before continuing.',
    expired:'Session expired. Confirm to continue.',
  };
  const t = key => globalThis.BeatBrowserUI.text(key, locale);
  return {label:t(labels[space.state] || 'Unknown state'),
    detail:['finished','stopped'].includes(space.state) ? '' : t(reasons[space.pauseReason] || (space.state==='user'?'Review before continuing.':'')),
    terminal:['finished','stopped'].includes(space.state),
    canResume:['user','interrupted','expired','recovered'].includes(space.state) && !space.missingPages?.length && (space.pages===undefined || space.pages.length>0),
  };
}
export function activityLabel(event, locale = 'en') {
  const t = key => globalThis.BeatBrowserUI.text(key, locale);
  if (event.type==='user') return t(({'window-focused':'Window gained focus','review-requested':'Review requested',handoff:'Control handed over','page-moved':'Page moved','popup-outside':'External popup detected'})[event.reason] || 'Task paused');
  return t(({reconnected:'Agent reconnected','page-linked':'Page linked',opened:'Task started',resumed:'Control returned',progress:'Progress updated','page-added':'Page added','page-closed':'Page closed','page-released':'Page released',finished:'Task completed',stopped:'Task stopped',interrupted:'Control disconnected',expired:'Session expired',popup:'Popup detected',receipt:'Receipt'})[event.type] || 'Progress updated');
}
