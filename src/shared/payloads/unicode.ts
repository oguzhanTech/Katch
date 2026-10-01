import type { PayloadItem } from '../types'

export const UNICODE_PAYLOADS: PayloadItem[] = [
  { id: 'uni-1', category: 'unicodeEmoji', featured: true, label: 'Emoji cluster', value: '👨‍👩‍👧‍👦🔥💯🚀' },
  { id: 'uni-2', category: 'unicodeEmoji', featured: true, label: 'RTL override', value: 'test\u202Etxt' },
  { id: 'uni-3', category: 'unicodeEmoji', featured: true, label: 'ZWJ', value: 'a\u200Db\u200Dc' },
  { id: 'uni-4', category: 'unicodeEmoji', featured: true, label: 'Combining', value: 'e\u0301\u0302\u0303\u0304' },
  { id: 'uni-5', category: 'unicodeEmoji', featured: true, label: 'Homoglyph', value: 'аdmin' },
  { id: 'uni-6', category: 'unicodeEmoji', featured: true, label: 'Fullwidth', value: 'ｔｅｓｔ＠ｅｘａｍｐｌｅ．ｃｏｍ' },
  { id: 'uni-7', category: 'unicodeEmoji', featured: true, label: 'ZWNJ', value: 'a\u200Cb' },
  { id: 'uni-8', category: 'unicodeEmoji', featured: true, label: 'BOM', value: '\uFEFFhidden' },
  { id: 'uni-9', category: 'unicodeEmoji', label: 'LTR mark', value: '\u200Etest' },
  { id: 'uni-10', category: 'unicodeEmoji', label: 'Arabic', value: 'مرحبا' },
  { id: 'uni-11', category: 'unicodeEmoji', label: 'CJK', value: '测试文字' },
  { id: 'uni-12', category: 'unicodeEmoji', label: 'Hangul', value: '테스트' },
  { id: 'uni-13', category: 'unicodeEmoji', label: 'Emoji ZWJ family', value: '👨‍👩‍👧' },
  { id: 'uni-14', category: 'unicodeEmoji', label: 'Skin tone', value: '👋🏻👋🏼👋🏽' },
  { id: 'uni-15', category: 'unicodeEmoji', label: 'Flag', value: '🇹🇷🇺🇸' },
  { id: 'uni-16', category: 'unicodeEmoji', label: 'Math symbols', value: '∑∏√∞≈≠' },
  { id: 'uni-17', category: 'unicodeEmoji', label: 'Soft hyphen', value: 'soft\u00ADhyphen' },
  { id: 'uni-18', category: 'unicodeEmoji', label: 'NBSP only', value: '\u00A0\u00A0\u00A0' },
  { id: 'uni-19', category: 'unicodeEmoji', featured: true, label: 'Bidi spoof', value: 'user\u202Emoc.elpmaxe@' },
  { id: 'uni-20', category: 'unicodeEmoji', featured: true, label: 'Tag chars', value: `test${String.fromCodePoint(0xe0061)}${String.fromCodePoint(0xe0062)}` },
]
