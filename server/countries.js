// Countries - the ONE list every form that asks "which country?" reads from
// (SUPREME RULE II: single source; never a second hand-typed list in a widget).
//
// ISO 3166-1 alpha-2 codes with their English short names. Display names are
// localised at render time through Intl.DisplayNames when the browser has it
// (every modern browser does), falling back to the English name, so a visitor
// reading the site in German sees "Deutschland" while the lead we store still
// carries the stable code + English name for the superadmin Leads grid/email.
//
// Dependency-free on purpose (SUPREME RULE XIII: no npm package for ~250 lines).

export const COUNTRIES = [
  ['AF', 'Afghanistan'], ['AX', 'Åland Islands'], ['AL', 'Albania'], ['DZ', 'Algeria'],
  ['AS', 'American Samoa'], ['AD', 'Andorra'], ['AO', 'Angola'], ['AI', 'Anguilla'],
  ['AQ', 'Antarctica'], ['AG', 'Antigua and Barbuda'], ['AR', 'Argentina'], ['AM', 'Armenia'],
  ['AW', 'Aruba'], ['AU', 'Australia'], ['AT', 'Austria'], ['AZ', 'Azerbaijan'],
  ['BS', 'Bahamas'], ['BH', 'Bahrain'], ['BD', 'Bangladesh'], ['BB', 'Barbados'],
  ['BY', 'Belarus'], ['BE', 'Belgium'], ['BZ', 'Belize'], ['BJ', 'Benin'],
  ['BM', 'Bermuda'], ['BT', 'Bhutan'], ['BO', 'Bolivia'], ['BQ', 'Bonaire, Sint Eustatius and Saba'],
  ['BA', 'Bosnia and Herzegovina'], ['BW', 'Botswana'], ['BV', 'Bouvet Island'], ['BR', 'Brazil'],
  ['IO', 'British Indian Ocean Territory'], ['BN', 'Brunei Darussalam'], ['BG', 'Bulgaria'], ['BF', 'Burkina Faso'],
  ['BI', 'Burundi'], ['CV', 'Cabo Verde'], ['KH', 'Cambodia'], ['CM', 'Cameroon'],
  ['CA', 'Canada'], ['KY', 'Cayman Islands'], ['CF', 'Central African Republic'], ['TD', 'Chad'],
  ['CL', 'Chile'], ['CN', 'China'], ['CX', 'Christmas Island'], ['CC', 'Cocos (Keeling) Islands'],
  ['CO', 'Colombia'], ['KM', 'Comoros'], ['CG', 'Congo'], ['CD', 'Congo, Democratic Republic of the'],
  ['CK', 'Cook Islands'], ['CR', 'Costa Rica'], ['CI', "Côte d'Ivoire"], ['HR', 'Croatia'],
  ['CU', 'Cuba'], ['CW', 'Curaçao'], ['CY', 'Cyprus'], ['CZ', 'Czechia'],
  ['DK', 'Denmark'], ['DJ', 'Djibouti'], ['DM', 'Dominica'], ['DO', 'Dominican Republic'],
  ['EC', 'Ecuador'], ['EG', 'Egypt'], ['SV', 'El Salvador'], ['GQ', 'Equatorial Guinea'],
  ['ER', 'Eritrea'], ['EE', 'Estonia'], ['SZ', 'Eswatini'], ['ET', 'Ethiopia'],
  ['FK', 'Falkland Islands (Malvinas)'], ['FO', 'Faroe Islands'], ['FJ', 'Fiji'], ['FI', 'Finland'],
  ['FR', 'France'], ['GF', 'French Guiana'], ['PF', 'French Polynesia'], ['TF', 'French Southern Territories'],
  ['GA', 'Gabon'], ['GM', 'Gambia'], ['GE', 'Georgia'], ['DE', 'Germany'],
  ['GH', 'Ghana'], ['GI', 'Gibraltar'], ['GR', 'Greece'], ['GL', 'Greenland'],
  ['GD', 'Grenada'], ['GP', 'Guadeloupe'], ['GU', 'Guam'], ['GT', 'Guatemala'],
  ['GG', 'Guernsey'], ['GN', 'Guinea'], ['GW', 'Guinea-Bissau'], ['GY', 'Guyana'],
  ['HT', 'Haiti'], ['HM', 'Heard Island and McDonald Islands'], ['VA', 'Holy See'], ['HN', 'Honduras'],
  ['HK', 'Hong Kong'], ['HU', 'Hungary'], ['IS', 'Iceland'], ['IN', 'India'],
  ['ID', 'Indonesia'], ['IR', 'Iran'], ['IQ', 'Iraq'], ['IE', 'Ireland'],
  ['IM', 'Isle of Man'], ['IL', 'Israel'], ['IT', 'Italy'], ['JM', 'Jamaica'],
  ['JP', 'Japan'], ['JE', 'Jersey'], ['JO', 'Jordan'], ['KZ', 'Kazakhstan'],
  ['KE', 'Kenya'], ['KI', 'Kiribati'], ['KP', "Korea, Democratic People's Republic of"], ['KR', 'Korea, Republic of'],
  ['KW', 'Kuwait'], ['KG', 'Kyrgyzstan'], ['LA', "Lao People's Democratic Republic"], ['LV', 'Latvia'],
  ['LB', 'Lebanon'], ['LS', 'Lesotho'], ['LR', 'Liberia'], ['LY', 'Libya'],
  ['LI', 'Liechtenstein'], ['LT', 'Lithuania'], ['LU', 'Luxembourg'], ['MO', 'Macao'],
  ['MG', 'Madagascar'], ['MW', 'Malawi'], ['MY', 'Malaysia'], ['MV', 'Maldives'],
  ['ML', 'Mali'], ['MT', 'Malta'], ['MH', 'Marshall Islands'], ['MQ', 'Martinique'],
  ['MR', 'Mauritania'], ['MU', 'Mauritius'], ['YT', 'Mayotte'], ['MX', 'Mexico'],
  ['FM', 'Micronesia'], ['MD', 'Moldova'], ['MC', 'Monaco'], ['MN', 'Mongolia'],
  ['ME', 'Montenegro'], ['MS', 'Montserrat'], ['MA', 'Morocco'], ['MZ', 'Mozambique'],
  ['MM', 'Myanmar'], ['NA', 'Namibia'], ['NR', 'Nauru'], ['NP', 'Nepal'],
  ['NL', 'Netherlands'], ['NC', 'New Caledonia'], ['NZ', 'New Zealand'], ['NI', 'Nicaragua'],
  ['NE', 'Niger'], ['NG', 'Nigeria'], ['NU', 'Niue'], ['NF', 'Norfolk Island'],
  ['MK', 'North Macedonia'], ['MP', 'Northern Mariana Islands'], ['NO', 'Norway'], ['OM', 'Oman'],
  ['PK', 'Pakistan'], ['PW', 'Palau'], ['PS', 'Palestine, State of'], ['PA', 'Panama'],
  ['PG', 'Papua New Guinea'], ['PY', 'Paraguay'], ['PE', 'Peru'], ['PH', 'Philippines'],
  ['PN', 'Pitcairn'], ['PL', 'Poland'], ['PT', 'Portugal'], ['PR', 'Puerto Rico'],
  ['QA', 'Qatar'], ['RE', 'Réunion'], ['RO', 'Romania'], ['RU', 'Russian Federation'],
  ['RW', 'Rwanda'], ['BL', 'Saint Barthélemy'], ['SH', 'Saint Helena, Ascension and Tristan da Cunha'], ['KN', 'Saint Kitts and Nevis'],
  ['LC', 'Saint Lucia'], ['MF', 'Saint Martin (French part)'], ['PM', 'Saint Pierre and Miquelon'], ['VC', 'Saint Vincent and the Grenadines'],
  ['WS', 'Samoa'], ['SM', 'San Marino'], ['ST', 'Sao Tome and Principe'], ['SA', 'Saudi Arabia'],
  ['SN', 'Senegal'], ['RS', 'Serbia'], ['SC', 'Seychelles'], ['SL', 'Sierra Leone'],
  ['SG', 'Singapore'], ['SX', 'Sint Maarten (Dutch part)'], ['SK', 'Slovakia'], ['SI', 'Slovenia'],
  ['SB', 'Solomon Islands'], ['SO', 'Somalia'], ['ZA', 'South Africa'], ['GS', 'South Georgia and the South Sandwich Islands'],
  ['SS', 'South Sudan'], ['ES', 'Spain'], ['LK', 'Sri Lanka'], ['SD', 'Sudan'],
  ['SR', 'Suriname'], ['SJ', 'Svalbard and Jan Mayen'], ['SE', 'Sweden'], ['CH', 'Switzerland'],
  ['SY', 'Syrian Arab Republic'], ['TW', 'Taiwan'], ['TJ', 'Tajikistan'], ['TZ', 'Tanzania'],
  ['TH', 'Thailand'], ['TL', 'Timor-Leste'], ['TG', 'Togo'], ['TK', 'Tokelau'],
  ['TO', 'Tonga'], ['TT', 'Trinidad and Tobago'], ['TN', 'Tunisia'], ['TR', 'Türkiye'],
  ['TM', 'Turkmenistan'], ['TC', 'Turks and Caicos Islands'], ['TV', 'Tuvalu'], ['UG', 'Uganda'],
  ['UA', 'Ukraine'], ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'], ['US', 'United States'],
  ['UM', 'United States Minor Outlying Islands'], ['UY', 'Uruguay'], ['UZ', 'Uzbekistan'], ['VU', 'Vanuatu'],
  ['VE', 'Venezuela'], ['VN', 'Viet Nam'], ['VG', 'Virgin Islands (British)'], ['VI', 'Virgin Islands (U.S.)'],
  ['WF', 'Wallis and Futuna'], ['EH', 'Western Sahara'], ['YE', 'Yemen'], ['ZM', 'Zambia'],
  ['ZW', 'Zimbabwe'],
]

const EN_BY_CODE = Object.fromEntries(COUNTRIES)

/** English short name for an ISO alpha-2 code ('' when unknown). */
export const countryNameEn = (code) => EN_BY_CODE[String(code || '').toUpperCase()] || ''

/** True when `code` is one of the ISO alpha-2 codes in COUNTRIES. */
export const isCountryCode = (code) => Boolean(EN_BY_CODE[String(code || '').toUpperCase()])

// Localised option list for a <select>: [{ code, name }] sorted by the localised
// name in that locale's collation. Intl.DisplayNames is optional - when the
// runtime lacks it (or the locale tag is odd) we keep the English names, so the
// dropdown is never empty or broken.
export function countryOptions(locale) {
  let dn = null
  try { dn = new Intl.DisplayNames([locale || 'en'], { type: 'region' }) } catch { dn = null }
  let collator
  try { collator = new Intl.Collator(locale || 'en') } catch { collator = new Intl.Collator('en') }
  const out = COUNTRIES.map(([code, en]) => {
    let name = en
    if (dn) { try { name = dn.of(code) || en } catch { name = en } }
    return { code, name }
  })
  out.sort((a, b) => collator.compare(a.name, b.name))
  return out
}
