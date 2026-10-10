// Types UTF-8 text from stdin into the focused app with Unicode keyboard events,
// so dictation lands at the cursor without touching the user's clipboard.
// Exit codes: 0 typed, 1 bad input, 2 no Accessibility permission (nothing typed).
#include <ApplicationServices/ApplicationServices.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

// macOS ignores anything past 20 UTF-16 units in a single keyboard event
#define CHUNK 20

static void post(CGEventSourceRef src, const UniChar *chars, UniCharCount len, bool down) {
  CGEventRef ev = CGEventCreateKeyboardEvent(src, 0, down);
  // Held modifiers (e.g. the shortcut key) would otherwise turn letters into shortcuts
  CGEventSetFlags(ev, 0);
  CGEventKeyboardSetUnicodeString(ev, len, chars);
  CGEventPost(kCGHIDEventTap, ev);
  CFRelease(ev);
}

int main(void) {
  if (!AXIsProcessTrusted()) return 2;

  size_t cap = 4096, size = 0, n;
  char *buf = malloc(cap);
  while (buf && (n = fread(buf + size, 1, cap - size, stdin)) > 0) {
    size += n;
    if (size == cap) buf = realloc(buf, cap *= 2);
  }
  if (!buf || size == 0) return 1;

  CFStringRef str = CFStringCreateWithBytes(NULL, (const UInt8 *)buf, size, kCFStringEncodingUTF8, false);
  free(buf);
  if (!str) return 1;

  CFIndex len = CFStringGetLength(str);
  UniChar *chars = malloc(sizeof(UniChar) * len);
  CFStringGetCharacters(str, CFRangeMake(0, len), chars);
  CFRelease(str);

  CGEventSourceRef src = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
  for (CFIndex i = 0; i < len;) {
    CFIndex count = len - i < CHUNK ? len - i : CHUNK;
    // Never split a surrogate pair (emoji) across two events
    if (count > 1 && CFStringIsSurrogateHighCharacter(chars[i + count - 1])) count--;
    post(src, chars + i, count, true);
    post(src, chars + i, count, false);
    i += count;
    // Busy apps (Electron, browsers) drop input that arrives faster than they drain it
    usleep(3000);
  }

  if (src) CFRelease(src);
  free(chars);
  return 0;
}
