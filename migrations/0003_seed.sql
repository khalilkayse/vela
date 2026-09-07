-- Public demo storefront so the live preview is playable without sign-in.

insert into shops (
  user_id, username, display_name, tagline, bio, avatar_initials, cover_style,
  layout, website_url, instagram_url, x_url, sifalo_connected, published
)
select
  'demo-maya',
  'maya',
  'Maya Atelier',
  'Brand systems for independent makers',
  'I help founders look as considered as the products they ship. Identity, templates, and one-to-one critiques — paid through Sifalo Pay.',
  'MA',
  'dusk',
  'hybrid',
  'https://maya.atelier',
  'https://instagram.com/mayaatelier',
  'https://x.com/mayaatelier',
  false,
  true
where not exists (select 1 from shops where username = 'maya');

insert into products (
  shop_id, user_id, slug, title, description, kind, price, cover_style,
  button_label, delivery_note, delivery_url, published, featured, sort_order
)
select s.id, s.user_id, v.slug, v.title, v.description, v.kind, v.price, v.cover_style,
       v.button_label, v.delivery_note, v.delivery_url, true, v.featured, v.sort_order
from shops s
cross join (
  values
    (
      'brand-identity-kit',
      'Brand Identity Kit',
      'A complete visual system: logomark, type pairing, color tokens, and a 24-page usage guide. Delivered as Figma + PDF.',
      'digital', 49.00, 'mesh-1', 'Buy the kit',
      'Download the Figma file and PDF brand guide.',
      'https://example.com/downloads/maya-identity-kit.pdf', true, 0
    ),
    (
      'social-template-pack',
      'Social Template Pack',
      '48 editorial templates for Instagram, X, and stories. Designed on an 8-column grid so every post feels like one house.',
      'digital', 19.00, 'mesh-2', 'Get the pack',
      'Canva + Figma template files.',
      'https://example.com/downloads/maya-social-pack.zip', true, 1
    ),
    (
      'brand-consultation',
      'Brand Consultation',
      'A 60-minute working session. We audit your current identity, pick a direction, and leave with a one-page system you can actually use.',
      'service', 150.00, 'mesh-3', 'Book a session',
      'You will receive a calendar link by email after payment.',
      'https://cal.com/maya-atelier/brand', false, 2
    ),
    (
      'website-audit',
      'Website Audit',
      'A written critique of your site: hierarchy, type, conversion paths, and a punch-list of the five highest-leverage changes.',
      'service', 89.00, 'mesh-4', 'Request audit',
      'A PDF audit is emailed within three business days.',
      'https://example.com/downloads/audit-brief.pdf', false, 3
    ),
    (
      'color-palette-guide',
      'Free color palette guide',
      'Twelve deep-violet palettes with contrast-safe pairings. No payment required.',
      'link', 0.00, 'mesh-5', 'Download free',
      'Open the public guide.',
      'https://example.com/downloads/maya-palettes.pdf', true, 4
    )
) as v(slug, title, description, kind, price, cover_style, button_label, delivery_note, delivery_url, featured, sort_order)
where s.username = 'maya'
  and not exists (
    select 1 from products p where p.shop_id = s.id and p.slug = v.slug
  );

insert into page_blocks (shop_id, user_id, kind, title, url, sort_order, visible)
select s.id, s.user_id, v.kind, v.title, v.url, v.sort_order, true
from shops s
cross join (
  values
    ('link', 'Read the studio notes', 'https://maya.atelier/notes', 0),
    ('link', 'Book a discovery call', 'https://cal.com/maya-atelier', 1),
    ('link', 'See selected work', 'https://maya.atelier/work', 2)
) as v(kind, title, url, sort_order)
where s.username = 'maya'
  and not exists (
    select 1 from page_blocks b where b.shop_id = s.id and b.title = v.title
  );
