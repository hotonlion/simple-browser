export const calculateStringLength: (string: string) => number = string => {
  // visit https://www.rfc-editor.org/rfc/rfc3629#section-3

  /*******************************************************************
   * Char. number range   |        UTF-8 octet sequence
   *     (hexadecimal)    |              (binary)
   *  --------------------+---------------------------------------------
   * 0000 0000-0000 007F  | 0xxxxxxx
   * 0000 0080-0000 07FF  | 110xxxxx 10xxxxxx
   * 0000 0800-0000 FFFF  | 1110xxxx 10xxxxxx 10xxxxxx
   * 0001 0000-0010 FFFF  | 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
   *******************************************************************/
  let total: number = 0
  for (const c of string) {
    const codePoint: number = c.charCodeAt(0)
    if (codePoint >= 0x00 && codePoint < 0x7F) {
      total += 1
    } else if (codePoint >= 0x80 && codePoint < 0x7FF) {
      total += 2
    } else if (codePoint >= 0x800 && codePoint < 0xFFFF) {
      total += 3
    } else if (codePoint >= 0x10000 && codePoint < 0x10FFFF) {
      total += 4
    }
  }
  return total
}
