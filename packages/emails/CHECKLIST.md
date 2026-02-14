# Production Readiness Checklist

Use this checklist before deploying email templates to production.

## Pre-Deployment

### Configuration

- [ ] Environment variables set in `.env`:
  - [ ] `RESEND_API_KEY` configured
  - [ ] `FROM_EMAIL` set to verified domain
  - [ ] `APP_URL` points to production domain
- [ ] Sender domain verified in Resend dashboard
- [ ] SPF, DKIM, DMARC records configured for domain
- [ ] Rate limits understood and configured

### Branding & Customization

- [ ] Logo updated in `Layout.tsx` header
- [ ] Brand colors updated in component styles
- [ ] Footer links point to correct URLs
- [ ] Company name and copyright year updated
- [ ] Support email address configured

### Template Review

- [ ] All email templates previewed in dev server
- [ ] Copy reviewed for grammar and tone
- [ ] Links tested and verified
- [ ] Unsubscribe links added to marketing emails
- [ ] Preview text optimized for each template

### Testing

#### Functional Testing

- [ ] Welcome email sent and received
- [ ] Verification email sent with working token
- [ ] Password reset email sent with working token
- [ ] Team invite email sent with working link
- [ ] Invoice email sent with correct amounts
- [ ] Subscription canceled email sent

#### Email Client Testing

- [ ] Gmail (Desktop)
- [ ] Gmail (Mobile)
- [ ] Outlook (Desktop)
- [ ] Outlook (Web)
- [ ] Apple Mail (macOS)
- [ ] Apple Mail (iOS)
- [ ] Yahoo Mail
- [ ] Thunderbird

#### Link Testing

- [ ] All CTA buttons clickable and working
- [ ] Fallback URLs display correctly
- [ ] UTM parameters appended correctly
- [ ] External links open in new tab
- [ ] No broken links

#### Rendering Testing

- [ ] Images load correctly (if any)
- [ ] Fonts render properly
- [ ] Colors display consistently
- [ ] Layout responsive on mobile
- [ ] No text overflow or clipping
- [ ] No horizontal scrolling

### Security Review

- [ ] No sensitive data in email bodies
- [ ] Tokens passed securely via HTTPS
- [ ] Expiry times clearly communicated
- [ ] Security notices included where needed
- [ ] Email addresses not leaked in CC/BCC
- [ ] Input validation for all dynamic content

### Performance

- [ ] HTML size under 102KB (Gmail clipping limit)
- [ ] No external CSS dependencies
- [ ] Inline styles used throughout
- [ ] No JavaScript in emails
- [ ] Images optimized and hosted externally

### Monitoring Setup

- [ ] Email delivery tracking configured
- [ ] Open rate tracking enabled
- [ ] Click-through tracking enabled
- [ ] Bounce rate monitoring set up
- [ ] Spam complaint monitoring enabled
- [ ] Error logging configured

## Integration

### Code Integration

- [ ] Email service wrapper implemented
- [ ] Error handling added
- [ ] Retry logic configured (via Inngest)
- [ ] Logging implemented
- [ ] Rate limiting considered

### Background Jobs

- [ ] Inngest functions created for each email type
- [ ] Retry policies configured
- [ ] Job monitoring enabled
- [ ] Failure alerts set up

### Database

- [ ] Email logs table created (optional)
- [ ] Unsubscribe preferences table created (optional)
- [ ] Email queue table created (if needed)

## Documentation

- [ ] README.md reviewed and accurate
- [ ] INTEGRATION.md examples tested
- [ ] QUICKSTART.md verified
- [ ] API documentation updated
- [ ] Team trained on email system

## Compliance

### Legal

- [ ] Privacy policy link included in footer
- [ ] Terms of service link included in footer
- [ ] Unsubscribe mechanism for marketing emails
- [ ] Physical mailing address (if required by law)
- [ ] GDPR compliance reviewed
- [ ] CAN-SPAM compliance verified

### Accessibility

- [ ] Alt text for images (if any)
- [ ] Semantic HTML used
- [ ] Color contrast sufficient
- [ ] Text scalable
- [ ] Screen reader friendly

## Launch

### Soft Launch

- [ ] Test with internal team emails
- [ ] Send to small batch of real users (10-100)
- [ ] Monitor delivery rates
- [ ] Check spam scores
- [ ] Review user feedback

### Full Launch

- [ ] All tests passing
- [ ] No critical issues from soft launch
- [ ] Monitoring dashboards ready
- [ ] Support team briefed
- [ ] Rollback plan documented

### Post-Launch Monitoring (First 24 Hours)

- [ ] Delivery rate > 95%
- [ ] Bounce rate < 2%
- [ ] Spam complaint rate < 0.1%
- [ ] No error spikes in logs
- [ ] User feedback positive

## Ongoing Maintenance

### Weekly

- [ ] Review delivery metrics
- [ ] Check for bounce patterns
- [ ] Monitor spam complaints
- [ ] Review error logs

### Monthly

- [ ] A/B test subject lines
- [ ] Review and update copy
- [ ] Check email client compatibility
- [ ] Update dependencies
- [ ] Review and improve templates

### Quarterly

- [ ] Full template audit
- [ ] Security review
- [ ] Performance optimization
- [ ] User feedback analysis
- [ ] Update branding if needed

## Emergency Procedures

### High Bounce Rate

1. Pause email sending
2. Review recipient list quality
3. Check DNS records (SPF, DKIM, DMARC)
4. Contact Resend support
5. Gradually resume sending

### High Spam Rate

1. Review email content for spam triggers
2. Check sender reputation
3. Verify unsubscribe links working
4. Review recipient engagement
5. Implement re-engagement campaign

### Service Outage

1. Check Resend status page
2. Review error logs
3. Enable fallback email provider (if configured)
4. Notify users if critical emails affected
5. Implement retry queue

## Tools & Resources

### Development

- React Email Dev Server: `bun run dev`
- TypeScript Checking: `bun run typecheck`
- Linting: `bun run lint`

### Testing

- [Litmus](https://www.litmus.com/) - Email testing across clients
- [Email on Acid](https://www.emailonacid.com/) - Email testing
- [Mail Tester](https://www.mail-tester.com/) - Spam score testing
- [Putsmail](https://putsmail.com/) - Send test emails

### Monitoring

- Resend Dashboard - Delivery metrics
- Sentry - Error tracking
- LogRocket - User session replay
- Google Analytics - UTM tracking

### Compliance

- [CAN-SPAM Compliance Guide](https://www.ftc.gov/tips-advice/business-center/guidance/can-spam-act-compliance-guide-business)
- [GDPR Email Marketing Guide](https://gdpr.eu/email-marketing/)

---

## Sign-Off

- [ ] Developer: Reviewed and tested **\*\***\_\_\_**\*\***
- [ ] Design: Approved visual design **\*\***\_\_\_**\*\***
- [ ] Legal: Compliance verified **\*\***\_\_\_**\*\***
- [ ] Product: Requirements met **\*\***\_\_\_**\*\***
- [ ] QA: All tests passing **\*\***\_\_\_**\*\***

**Ready for Production**: ☐ Yes ☐ No

**Date**: **\*\***\_\_\_**\*\***

**Notes**: **\*\***\*\***\*\***\*\*\*\***\*\***\*\***\*\***\_**\*\***\*\***\*\***\*\*\*\***\*\***\*\***\*\***

---
