// Types UTF-8 text from stdin into the focused app with Unicode keyboard events,
// so dictation lands at the cursor without touching the user's clipboard.
// With --paste-keycode it prints the keycode to press for Cmd+V instead.
// Exit codes: 0 typed, 1 bad input, 2 no Accessibility permission (nothing typed).
#include <ApplicationServices/ApplicationServices.h>
#include <Carbon/Carbon.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static void post(CGEventSourceRef src, const UniChar *chars, UniCharCount len, bool down) {
  CGEventRef ev = CGEventCreateKeyboardEvent(src, 0, down);
  // Held modifiers (e.g. the shortcut key) would otherwise turn letters into shortcuts
  CGEventSetFlags(ev, 0);
  CGEventKeyboardSetUnicodeString(ev, len, chars);
  CGEventPost(kCGHIDEventTap, ev);
  CFRelease(ev);
}

// Key that gives `ch` with Command held in this layout, or -1
static int keycode_for(TISInputSourceRef layout_src, UniChar ch) {
  if (!layout_src) return -1;
  CFDataRef data = TISGetInputSourceProperty(layout_src, kTISPropertyUnicodeKeyLayoutData);
  if (!data) return -1;
  const UCKeyboardLayout *layout = (const UCKeyboardLayout *)CFDataGetBytePtr(data);
  for (UInt16 code = 0; code < 128; code++) {
    UInt32 dead = 0;
    UniChar out[4];
    UniCharCount n = 0;
    if (UCKeyTranslate(layout, code, kUCKeyActionDown, (cmdKey >> 8) & 0xFF, LMGetKbdType(),
                       kUCKeyTranslateNoDeadKeysBit, &dead, 4, &n, out) == noErr && n == 1 && out[0] == ch)
      return code;
  }
  return -1;
}

// Prints the keycode for Cmd+V. V moves on some layouts (on Turkish F the ANSI V key is C),
// and non-Latin ones like Russian have no V at all, where macOS uses the ASCII-capable layout.
static int print_paste_keycode(void) {
  TISInputSourceRef cur = TISCopyCurrentKeyboardLayoutInputSource();
  int code = keycode_for(cur, 'v');
  if (cur) CFRelease(cur);
  if (code < 0) {
    TISInputSourceRef ascii = TISCopyCurrentASCIICapableKeyboardLayoutInputSource();
    code = keycode_for(ascii, 'v');
    if (ascii) CFRelease(ascii);
  }
  printf("%d\n", code < 0 ? kVK_ANSI_V : code);
  return 0;
}

int main(int argc, char **argv) {
  if (argc > 1 && strcmp(argv[1], "--paste-keycode") == 0) return print_paste_keycode();
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
    // One code point per event: xterm.js terminals and apps reading the DOM key only take the
    // first character of a multi-character event. A surrogate pair (emoji) stays together.
    CFIndex count = i + 1 < len && CFStringIsSurrogateHighCharacter(chars[i]) ? 2 : 1;
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
