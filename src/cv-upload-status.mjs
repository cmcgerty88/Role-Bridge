export function setCvUploadStatus(element, state, message) {
  if (state) element.dataset.uploadState = state;
  else delete element.dataset.uploadState;
  element.textContent = message;
}
