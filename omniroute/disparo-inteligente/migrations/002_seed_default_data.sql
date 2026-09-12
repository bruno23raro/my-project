insert into public.plans (id, name, slug, price, featured, limits)
values
  (gen_random_uuid(), 'Free', 'free', 0, false, '{"maxCampaigns":3,"maxContacts":200,"whatsappConnections":1,"instagramConnections":0,"aiBots":1}'),
  (gen_random_uuid(), 'Pro', 'pro', 59, true, '{"maxCampaigns":50,"maxContacts":15000,"whatsappConnections":3,"instagramConnections":1,"aiBots":5}'),
  (gen_random_uuid(), 'Ilimitado', 'unlimited', 149, false, '{"maxCampaigns":9999,"maxContacts":999999,"whatsappConnections":20,"instagramConnections":10,"aiBots":999}')
on conflict do nothing;

insert into public.site_settings (id, name, primary_color, secondary_color, font_family)
values
  (gen_random_uuid(), 'Disparo Inteligente', '#7c3aed', '#0ea5e9', 'Inter')
on conflict do nothing;
