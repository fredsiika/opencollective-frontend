import React from 'react';

import StyledLink from './StyledLink';

export const getI18nLink = linkProps => chunks => <StyledLink {...linkProps}>{chunks}</StyledLink>;
export const I18nBold = chunks => <strong>{chunks}</strong>;
export const I18nItalic = chunks => <i>{chunks}</i>;
export const I18nSupportLink = chunks => (
  <StyledLink href="mailto:support@opencollective.com">{chunks.length || 'support@opencollective.com'}</StyledLink>
);

export const I18nSignLink = msg => <StyledLink href="https://opencollective.com/signin?next=%2F">{msg}</StyledLink>;

const I18nFormatters = { strong: I18nBold, i: I18nItalic, SupportLink: I18nSupportLink, I18nSignLink: I18nSignLink };
export default I18nFormatters;
