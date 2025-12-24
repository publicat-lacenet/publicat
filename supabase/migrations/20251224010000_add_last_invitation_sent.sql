-- Afegir camp per controlar cooldown de reenviar invitacions
ALTER TABLE users
ADD COLUMN last_invitation_sent_at timestamptz;

COMMENT ON COLUMN users.last_invitation_sent_at IS 'Timestamp de l''última invitació enviada (per cooldown)';
