// Pre-filled reply templates for the Inquiries inbox. The template is chosen
// automatically from the inquiry type (buyer / investor).
 
const firstNameOf = (fullName = '') => (fullName.trim().split(/\s+/)[0] || 'there');
 
const BUYER = {
  subject: 'Thank You for Contacting Konkuwan Herbs',
  body: (firstName) => `Dear ${firstName},
 
Thank you for reaching out to Konkuwan Herbs.
 
We appreciate your interest in sourcing high-quality herbs, spices, medicinal plants, and value-added natural ingredients from us.
 
Our team has received your inquiry and will carefully review your requirements. We typically respond within 1-2 business days with information such as:
 
- Product availability
- Specifications
- Certifications
- Pricing
- Minimum Order Quantities (MOQs)
- Logistics details
 
To help us assist you more efficiently, you may reply with:
 
- Product(s) of interest
- Required quantity
- Intended application
- Destination country/city
- Any quality or certification requirements
 
At Konkuwan Herbs, we work closely with small and marginal farming communities to build transparent, sustainable, and reliable supply chains while delivering consistent quality to our partners.
 
We look forward to working with you.
 
Warm regards,
Konkuwan Herbs Team`,
};
 
const INVESTOR = {
  subject: 'Thank You for Your Interest in Konkuwan Herbs',
  body: (firstName) => `Dear ${firstName},
 
Thank you for your interest in Konkuwan Herbs.
 
We appreciate you taking the time to connect with us regarding potential investment, strategic partnerships, or collaboration opportunities.
 
Your message has been received and will be reviewed by a member of our leadership team. We aim to respond within 3-5 business days.
 
Konkuwan Herbs is building sustainable value chains for medicinal plants, herbs, spices, and natural ingredients by partnering with small and marginal farmers while creating scalable impact across agriculture, healthcare, and rural livelihoods.
 
If relevant, please feel free to share:
 
- Your organization or investment fund
- Area of interest
- Partnership focus
- Relevant documents
- Additional questions
 
We appreciate your interest and look forward to exploring potential opportunities together.
 
Warm regards,
Konkuwan Herbs Team`,
};
 
/**
 * Build a mailto: link with recipient, subject and a body pre-filled from the
 * template matching the inquiry type.
 */
export function buildReplyMailto(inquiry) {
  const tpl = inquiry?.type === 'investor' ? INVESTOR : BUYER;
  const firstName = firstNameOf(inquiry?.name);
  const params = new URLSearchParams({
    subject: tpl.subject,
    body: tpl.body(firstName),
  });
  // URLSearchParams encodes spaces as "+", which some mail clients show
  // literally — mailto needs %20.
  return `mailto:${inquiry?.email || ''}?${params.toString().replace(/\+/g, '%20')}`;
}
 
export { BUYER as buyerTemplate, INVESTOR as investorTemplate, firstNameOf };