const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

function getSupabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
}

const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || process.env.JWT_ADMIN_SECRET || 'change-me-admin-secret';
const TOKEN_EXPIRES_MS = Number(process.env.ADMIN_TOKEN_EXPIRES_MS) || 7 * 24 * 60 * 60 * 1000;
const SCRYPT_KEYLEN = 64;

// ========== HELPERS CRYPTO ==========
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64url(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64').toString('utf8');
}

function assinar(data) {
  return crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function criarToken(admin) {
  const payload = {
    id: admin.id,
    auth_number: admin.auth_number,
    email: admin.email,
    role: 'admin',
    exp: Date.now() + TOKEN_EXPIRES_MS,
  };
  const data = base64url(JSON.stringify(payload));
  const sig = assinar(data);
  return `${data}.${sig}`;
}

function verificarToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    throw new Error('Token inválido.');
  }
  const [data, sig] = token.split('.');
  if (!data || !sig) throw new Error('Token inválido.');

  const esperado = assinar(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Assinatura inválida.');
  }

  const payload = JSON.parse(fromBase64url(data));
  if (!payload || payload.role !== 'admin') throw new Error('Sem permissão de admin.');
  if (!payload.exp || Date.now() > payload.exp) throw new Error('Token expirado.');
  return payload;
}

function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, comment: 'Token em falta.' });
    }
    req.admin = verificarToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, comment: error.message || 'Token inválido.' });
  }
}

function gerarAuthNumber() {
  return `ADM-${crypto.randomInt(100000, 999999)}`;
}

function gerarReferralCode() {
  return `REF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function authNumberUnico(supabase) {
  for (let i = 0; i < 10; i++) {
    const code = gerarAuthNumber();
    const { data } = await supabase.from('admins').select('id').eq('auth_number', code).maybeSingle();
    if (!data) return code;
  }
  throw new Error('Não foi possível gerar auth_number.');
}

async function referralUnico(supabase) {
  for (let i = 0; i < 10; i++) {
    const code = gerarReferralCode();
    const { data } = await supabase.from('admins').select('id').eq('referral_code', code).maybeSingle();
    if (!data) return code;
  }
  throw new Error('Não foi possível gerar referral_code.');
}

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GOOGLEEMAIL,
      pass: process.env.GOOGLEPASS,
    },
  });
}
function gerarRecoveryCode() {
  // 8 caracteres legíveis (sem O/0/I/1 para evitar confusão)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

async function enviarEmailConfirmacao(email, nome, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const link = `${frontendUrl}/admin/confirmar-email?token=${token}`;

  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px; margin: 0;">
      <div style="max-width: 500px; background-color: #ffffff; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background-color: #2563eb; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">ADMIN</h1>
          <p style="color: #dbeafe; margin: 5px 0 0 0; font-size: 13px;">Mercado Bissau - Confirmação de Email</p>
        </div>
        <div style="padding: 30px; color: #333333; text-align: center;">
          <p style="font-size: 15px; line-height: 1.5;">Olá ${nome || ''}!</p>
          <p style="font-size: 15px; line-height: 1.5;">Confirme o seu email de administrador:</p>
          <a href="${link}" style="background:#2563eb;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;margin-top:12px;">
            Confirmar Email
          </a>
          <p style="font-size: 13px; color: #777777; margin-top: 25px;">O link expira em 24 horas. Se não pediu isto, ignore.</p>
        </div>
        <div style="background-color: #333333; padding: 15px; text-align: center;">
          <p style="color: #aaaaaa; font-size: 11px; margin: 0;">&copy; 2026 Mercado Bissau</p>
        </div>
      </div>
    </div>
  `;

  const transporter = getTransporter();
  return transporter.sendMail({
    from: `"Mercado Bissau Admin" <${process.env.GOOGLEEMAIL}>`,
    to: email,
    subject: 'Confirme o seu email de admin - Mercado Bissau',
    html: htmlTemplate,
  });
}

function publicAdmin(row) {
  if (!row) return null;
  return {
    id: row.id,
    auth_number: row.auth_number,
    email: row.email,
    first_name: row.first_name,
    middle_name: row.middle_name,
    last_name: row.last_name,
    organization_name: row.organization_name,
    phone: row.phone,
    referral_code: row.referral_code,
    referred_by: row.referred_by,
    is_active: row.is_active,
    email_confirmed: row.email_confirmed,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ========== 1. REGISTAR ADMIN (referral + email) ==========
// Body: referral_code, referrer_auth_number, password, email,
//       first_name, middle_name, last_name, organization_name?, phone?
// 1.º admin: se tabela vazia, referral não é obrigatório
router.post('/register', async (req, res) => {
  try {
    const {
      referral_code,
      referrer_auth_number,
      password,
      email,
      first_name,
      middle_name,
      last_name,
      organization_name,
      phone,
    } = req.body;

    if (!password || !email || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        comment: 'password, email, first_name e last_name são obrigatórios.',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        comment: 'A password deve ter pelo menos 6 caracteres.',
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const supabase = getSupabaseAdmin();

    const { data: emailExists } = await supabase
      .from('admins')
      .select('id')
      .eq('email', emailNorm)
      .maybeSingle();

    if (emailExists) {
      return res.status(409).json({ success: false, comment: 'Este email já está registado.' });
    }

    const { count, error: countError } = await supabase
      .from('admins')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      return res.status(400).json({ success: false, comment: countError.message });
    }

    const isFirstAdmin = !count || count === 0;
    let referredBy = null;

    if (!isFirstAdmin) {
      if (!referral_code || !referrer_auth_number) {
        return res.status(400).json({
          success: false,
          comment: 'Precisa do referral_code e do auth_number do admin que o convidou.',
        });
      }

      const { data: referrer, error: refError } = await supabase
        .from('admins')
        .select('id, auth_number, referral_code, is_active, email_confirmed')
        .eq('auth_number', String(referrer_auth_number).trim())
        .eq('referral_code', String(referral_code).trim().toUpperCase())
        .maybeSingle();

      if (refError) {
        return res.status(400).json({ success: false, comment: refError.message });
      }

      if (!referrer || !referrer.is_active || !referrer.email_confirmed) {
        return res.status(403).json({
          success: false,
          comment: 'Referral inválido ou admin convidante inativo.',
        });
      }

      referredBy = referrer.auth_number;
    }

    const auth_number = await authNumberUnico(supabase);
    const my_referral_code = await referralUnico(supabase);
    const password_hash = hashPassword(password);
    const email_confirm_token = crypto.randomBytes(32).toString('hex');
    const email_confirm_expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: novo, error: insertError } = await supabase
      .from('admins')
      .insert([
        {
          auth_number,
          email: emailNorm,
          password_hash,
          first_name: String(first_name).trim(),
          middle_name: middle_name ? String(middle_name).trim() : null,
          last_name: String(last_name).trim(),
          organization_name: organization_name ? String(organization_name).trim() : null,
          phone: phone ? String(phone).trim() : null,
          referral_code: my_referral_code,
          referred_by: referredBy,
          is_active: false,
          email_confirmed: false,
          email_confirm_token,
          email_confirm_expires,
        },
      ])
      .select('*')
      .single();

    if (insertError) {
      return res.status(400).json({ success: false, comment: insertError.message });
    }

    try {
      const sender = await enviarEmailConfirmacao(emailNorm, first_name, email_confirm_token);
      if (!sender.accepted || sender.accepted.length === 0) {
        console.log('Aviso: email de confirmação pode não ter sido aceite pelo SMTP.');
      }
    } catch (mailErr) {
      console.log('Erro ao enviar email de confirmação:', mailErr.message);
    }

    return res.status(200).json({
      success: true,
      admin: {
        auth_number: novo.auth_number,
        email: novo.email,
        first_name: novo.first_name,
        middle_name: novo.middle_name,
        last_name: novo.last_name,
      },
      comment: isFirstAdmin
        ? 'Primeiro admin criado. Confirme o email antes de fazer login. Guarde o auth_number.'
        : 'Conta criada. Confirme o email antes de fazer login. Guarde o auth_number.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: `Coding error: ${error.message}` });
  }
});

// ========== 2. CONFIRMAR EMAIL ==========
router.post('/confirm-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, comment: 'Token é obrigatório.' });
    }

    const supabase = getSupabaseAdmin();
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email_confirm_token', String(token).trim())
      .maybeSingle();

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }

    if (!admin) {
      return res.status(400).json({ success: false, comment: 'Token inválido.' });
    }

    if (admin.email_confirm_expires && new Date(admin.email_confirm_expires) < new Date()) {
      return res.status(400).json({ success: false, comment: 'Token de confirmação expirado.' });
    }

    const { error: upErr } = await supabase
      .from('admins')
      .update({
        email_confirmed: true,
        is_active: true,
        email_confirm_token: null,
        email_confirm_expires: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', admin.id);

    if (upErr) {
      return res.status(400).json({ success: false, comment: upErr.message });
    }

    return res.status(200).json({
      success: true,
      auth_number: admin.auth_number,
      comment: 'Email confirmado. Já pode fazer login com auth_number e password.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 3. LOGIN (auth_number + password) ==========
router.post('/login', async (req, res) => {
  try {
    const { auth_number, password } = req.body;

    if (!auth_number || !password) {
      return res.status(400).json({
        success: false,
        comment: 'auth_number e password são obrigatórios.',
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('auth_number', String(auth_number).trim())
      .maybeSingle();

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }

    if (!admin) {
      return res.status(401).json({ success: false, comment: 'Credenciais inválidas.' });
    }

    if (!admin.email_confirmed) {
      return res.status(403).json({
        success: false,
        comment: 'Confirme o email antes de entrar.',
      });
    }

    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        comment: 'Conta desativada.',
      });
    }

    const ok = verifyPassword(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, comment: 'Credenciais inválidas.' });
    }

    const token = criarToken(admin);

    return res.status(200).json({
      success: true,
      token,
      admin: publicAdmin(admin),
      comment: 'Login efetuado com sucesso.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 4. PERFIL (logado) ==========
router.get('/me', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('id', req.admin.id)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }

    if (!admin) {
      return res.status(404).json({ success: false, comment: 'Admin não encontrado.' });
    }

    return res.status(200).json({
      success: true,
      admin: publicAdmin(admin),
      comment: 'Perfil carregado.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 5. ATUALIZAR CONTA ==========
// Body (qualquer combinação): first_name, middle_name, last_name,
// organization_name, phone, email
router.put('/update', requireAdmin, async (req, res) => {
  try {
    const { first_name, middle_name, last_name, organization_name, phone, email } = req.body;
    const supabase = getSupabaseAdmin();

    const updates = { updated_at: new Date().toISOString() };

    if (first_name !== undefined) updates.first_name = String(first_name).trim();
    if (middle_name !== undefined) updates.middle_name = middle_name ? String(middle_name).trim() : null;
    if (last_name !== undefined) updates.last_name = String(last_name).trim();
    if (organization_name !== undefined) {
      updates.organization_name = organization_name ? String(organization_name).trim() : null;
    }
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;

    if (email !== undefined) {
      const emailNorm = String(email).trim().toLowerCase();
      const { data: taken } = await supabase
        .from('admins')
        .select('id')
        .eq('email', emailNorm)
        .neq('id', req.admin.id)
        .maybeSingle();

      if (taken) {
        return res.status(409).json({ success: false, comment: 'Email já usado por outro admin.' });
      }
      updates.email = emailNorm;
      // se mudar email, podes forçar nova confirmação (opcional):
      // updates.email_confirmed = false;
    }

    if (Object.keys(updates).length <= 1) {
      return res.status(400).json({ success: false, comment: 'Nada para atualizar.' });
    }

    const { data, error } = await supabase
      .from('admins')
      .update(updates)
      .eq('id', req.admin.id)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }

    return res.status(200).json({
      success: true,
      admin: publicAdmin(data),
      comment: 'Conta atualizada com sucesso.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 6. MUDAR PASSWORD ==========
router.post('/change-password', requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        comment: 'currentPassword e newPassword são obrigatórios.',
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        comment: 'A nova password deve ter pelo menos 6 caracteres.',
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, password_hash')
      .eq('id', req.admin.id)
      .maybeSingle();

    if (error || !admin) {
      return res.status(404).json({ success: false, comment: 'Admin não encontrado.' });
    }

    if (!verifyPassword(currentPassword, admin.password_hash)) {
      return res.status(401).json({ success: false, comment: 'Password atual incorreta.' });
    }

    const password_hash = hashPassword(newPassword);
    const { error: upErr } = await supabase
      .from('admins')
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq('id', admin.id);

    if (upErr) {
      return res.status(400).json({ success: false, comment: upErr.message });
    }

    return res.status(200).json({
      success: true,
      comment: 'Password alterada com sucesso.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 7. GERAR NOVO CÓDIGO DE REFERRAL ==========
router.post('/referral/generate', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const novoCodigo = await referralUnico(supabase);

    const { data, error } = await supabase
      .from('admins')
      .update({
        referral_code: novoCodigo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.admin.id)
      .select('referral_code, auth_number')
      .single();

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }

    return res.status(200).json({
      success: true,
      referral_code: data.referral_code,
      auth_number: data.auth_number,
      comment: 'Novo código de referral gerado. Partilhe referral_code + auth_number.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 8. DESATIVAR CONTA (própria ou outra, se for o próprio token) ==========
// Body opcional: { target_auth_number } — se vazio, desativa a própria
router.post('/deactivate', requireAdmin, async (req, res) => {
  try {
    const { target_auth_number } = req.body || {};
    const supabase = getSupabaseAdmin();

    let targetId = req.admin.id;

    if (target_auth_number && String(target_auth_number).trim() !== req.admin.auth_number) {
      const { data: target, error } = await supabase
        .from('admins')
        .select('id, auth_number, is_active')
        .eq('auth_number', String(target_auth_number).trim())
        .maybeSingle();

      if (error || !target) {
        return res.status(404).json({ success: false, comment: 'Admin alvo não encontrado.' });
      }
      targetId = target.id;
    }

    const { error: upErr } = await supabase
      .from('admins')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', targetId);

    if (upErr) {
      return res.status(400).json({ success: false, comment: upErr.message });
    }

    return res.status(200).json({
      success: true,
      comment: 'Conta desativada com sucesso.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 9. REATIVAR CONTA ==========
router.post('/activate', requireAdmin, async (req, res) => {
  try {
    const { target_auth_number } = req.body || {};
    if (!target_auth_number) {
      return res.status(400).json({
        success: false,
        comment: 'target_auth_number é obrigatório.',
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: target, error } = await supabase
      .from('admins')
      .select('id, email_confirmed')
      .eq('auth_number', String(target_auth_number).trim())
      .maybeSingle();

    if (error || !target) {
      return res.status(404).json({ success: false, comment: 'Admin não encontrado.' });
    }

    if (!target.email_confirmed) {
      return res.status(400).json({
        success: false,
        comment: 'Não é possível ativar: email ainda não confirmado.',
      });
    }

    const { error: upErr } = await supabase
      .from('admins')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', target.id);

    if (upErr) {
      return res.status(400).json({ success: false, comment: upErr.message });
    }

    return res.status(200).json({
      success: true,
      comment: 'Conta reativada com sucesso.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 10. APAGAR CONTA ==========
// Body: { password } para confirmar (própria conta)
// ou { target_auth_number, password } — password do admin logado
router.delete('/account', requireAdmin, async (req, res) => {
  try {
    const { password, target_auth_number } = req.body || {};

    if (!password) {
      return res.status(400).json({
        success: false,
        comment: 'password é obrigatória para confirmar a eliminação.',
      });
    }

    const supabase = getSupabaseAdmin();

    const { data: me, error: meErr } = await supabase
      .from('admins')
      .select('id, password_hash, auth_number')
      .eq('id', req.admin.id)
      .maybeSingle();

    if (meErr || !me) {
      return res.status(404).json({ success: false, comment: 'Admin não encontrado.' });
    }

    if (!verifyPassword(password, me.password_hash)) {
      return res.status(401).json({ success: false, comment: 'Password incorreta.' });
    }

    let deleteId = me.id;

    if (target_auth_number && String(target_auth_number).trim() !== me.auth_number) {
      const { data: target, error } = await supabase
        .from('admins')
        .select('id')
        .eq('auth_number', String(target_auth_number).trim())
        .maybeSingle();

      if (error || !target) {
        return res.status(404).json({ success: false, comment: 'Admin alvo não encontrado.' });
      }
      deleteId = target.id;
    }

    const { error: delErr } = await supabase.from('admins').delete().eq('id', deleteId);

    if (delErr) {
      return res.status(400).json({ success: false, comment: delErr.message });
    }

    return res.status(200).json({
      success: true,
      comment: 'Conta de admin eliminada com sucesso.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 11. LISTAR ADMINS ==========
router.get('/list', requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('admins')
      .select(
        'id, auth_number, email, first_name, middle_name, last_name, organization_name, phone, referral_code, referred_by, is_active, email_confirmed, created_at'
      )
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }

    return res.status(200).json({
      success: true,
      admins: data || [],
      comment: 'Lista de admins.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== GERAR CÓDIGO DE ACESSO (outro admin esqueceu a password) ==========
router.post('/recovery/generate', requireAdmin, async (req, res) => {
  try {
    const { target_auth_number } = req.body || {};

    if (!target_auth_number) {
      return res.status(400).json({
        success: false,
        comment: 'target_auth_number é obrigatório.',
      });
    }

    const targetAuth = String(target_auth_number).trim();

    if (targetAuth === req.admin.auth_number) {
      return res.status(400).json({
        success: false,
        comment: 'Não pode gerar código de recuperação para a sua própria conta por este meio.',
      });
    }

    const supabase = getSupabaseAdmin();

    const { data: target, error } = await supabase
      .from('admins')
      .select('id, auth_number, first_name, last_name, email, is_active, email_confirmed')
      .eq('auth_number', targetAuth)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }

    if (!target) {
      return res.status(404).json({ success: false, comment: 'Admin alvo não encontrado.' });
    }

    if (!target.email_confirmed) {
      return res.status(400).json({
        success: false,
        comment: 'Este admin ainda não confirmou o email.',
      });
    }

    const recovery_code = gerarRecoveryCode();
    // válido 30 minutos
    const recovery_code_expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: upErr } = await supabase
      .from('admins')
      .update({
        recovery_code,
        recovery_code_expires,
        recovery_code_by: req.admin.auth_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', target.id);

    if (upErr) {
      return res.status(400).json({ success: false, comment: upErr.message });
    }

    return res.status(200).json({
      success: true,
      recovery_code,
      expires_at: recovery_code_expires,
      target: {
        auth_number: target.auth_number,
        name: `${target.first_name} ${target.last_name}`.trim(),
        email: target.email,
      },
      comment:
        'Código gerado. Entregue-o de forma segura ao admin. Válido 30 minutos. Ele usa auth_number + este código + nova password.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== REDEFINIR PASSWORD COM CÓDIGO DE ACESSO ==========
router.post('/recovery/reset', async (req, res) => {
  try {
    const { auth_number, recovery_code, newPassword } = req.body || {};

    if (!auth_number || !recovery_code || !newPassword) {
      return res.status(400).json({
        success: false,
        comment: 'auth_number, recovery_code e newPassword são obrigatórios.',
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        comment: 'A nova password deve ter pelo menos 6 caracteres.',
      });
    }

    const supabase = getSupabaseAdmin();

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('auth_number', String(auth_number).trim())
      .maybeSingle();

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }

    if (!admin) {
      return res.status(401).json({ success: false, comment: 'Dados inválidos.' });
    }

    if (!admin.recovery_code || !admin.recovery_code_expires) {
      return res.status(400).json({
        success: false,
        comment: 'Não existe código de recuperação ativo. Peça a outro admin para gerar.',
      });
    }

    if (new Date(admin.recovery_code_expires) < new Date()) {
      // limpa código expirado
      await supabase
        .from('admins')
        .update({
          recovery_code: null,
          recovery_code_expires: null,
          recovery_code_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', admin.id);

      return res.status(400).json({
        success: false,
        comment: 'Código de recuperação expirado. Peça um novo a outro admin.',
      });
    }

    // comparação segura do código
    const a = Buffer.from(String(admin.recovery_code).toUpperCase());
    const b = Buffer.from(String(recovery_code).trim().toUpperCase());
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ success: false, comment: 'Código de recuperação inválido.' });
    }

    if (!admin.email_confirmed) {
      return res.status(403).json({
        success: false,
        comment: 'Email ainda não confirmado.',
      });
    }

    const password_hash = hashPassword(newPassword);

    const { error: upErr } = await supabase
      .from('admins')
      .update({
        password_hash,
        recovery_code: null,
        recovery_code_expires: null,
        recovery_code_by: null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', admin.id);

    if (upErr) {
      return res.status(400).json({ success: false, comment: upErr.message });
    }

    // opcional: já devolver token para entrar logo
    const token = criarToken({
      id: admin.id,
      auth_number: admin.auth_number,
      email: admin.email,
    });

    return res.status(200).json({
      success: true,
      token,
      admin: publicAdmin({ ...admin, is_active: true }),
      comment: 'Password redefinida com sucesso. Já pode usar a nova password no login.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

module.exports = router;
module.exports.requireAdmin = requireAdmin;