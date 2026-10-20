/** Sync programmatic value changes with react-hook-form (uncontrolled register). */
export function setNativeFormValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const proto = Object.getPrototypeOf(el) as HTMLInputElement;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  descriptor?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
