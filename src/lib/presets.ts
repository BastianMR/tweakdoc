export type FormatType = 'blank' | 'letter' | 'official_letter'

const letterHtml = `<h1>Letterhead</h1>
<p>City, {{Date}}</p>
<p>{{RecipientName}}<br>{{RecipientAddress}}</p>
<p>Dear {{RecipientName}},</p>
<p></p>
<p>Sincerely,</p>
<p>{{SenderName}}<br>{{SenderTitle}}</p>`

const officialLetterHtml = `<h1>{{OrganizationName}}</h1>
<p>Ref: {{ReferenceNumber}} &nbsp;·&nbsp; Date: {{Date}}</p>
<hr>
<p><strong>Subject:</strong> {{Subject}}</p>
<p>{{RecipientName}}<br>{{RecipientTitle}}<br>{{RecipientAddress}}</p>
<p></p>
<p>Signature: ____________________</p>
<p>{{SenderName}} — {{SenderTitle}}</p>`

export function getPresetHtml(formatType: FormatType): string {
  switch (formatType) {
    case 'letter':
      return letterHtml
    case 'official_letter':
      return officialLetterHtml
    default:
      return ''
  }
}
