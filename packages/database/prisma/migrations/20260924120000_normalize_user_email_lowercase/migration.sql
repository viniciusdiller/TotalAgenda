-- User.email passa a ser sempre minúsculo (login e criação normalizam via NormalizeEmail).
-- Se existirem dois usuários que só diferem pela caixa, o UPDATE viola o índice único e a
-- migration falha de propósito: resolver o duplicado manualmente antes de aplicar.
UPDATE "User" SET "email" = lower("email") WHERE "email" <> lower("email");
