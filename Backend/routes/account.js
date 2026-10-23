const express = require("express");
const router = express.Router();
const crypto = require("node:crypto");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");

const getSupabaseAdmin = () => {
  return createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } }
  )
}

async function apagarLojaEProdutos(supabase, userId) {
  try {
    const { data: stores } = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", userId);

    if (stores && stores.length > 0) {
      for (const store of stores) {
        await supabase.from("products").delete().eq("store_id", store.id);
      }
      await supabase.from("stores").delete().eq("user_id", userId);
    }
  } catch (err) {
    console.error("Erro ao limpar lojas e produtos:", err.message);
  }
}

router.post("/send-otp", async (req, res) => { 
  try { 
    const { email } = req.body; 
    if (!email) { return res.status(400).json({ success: false, comment: "O e-mail é obrigatório" }); } 

    const supabase = getSupabaseAdmin(); 

    // 1. VERIFICAR SE O UTILIZADOR JÁ EXISTE NO SUPABASE AUTH ANTES DE TUDO
    const { data: listUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error("Erro ao listar utilizadores:", listError.message);
      return res.status(400).json({ success: false, comment: "Erro ao verificar e-mail: " + listError.message });
    }

    const existingAuthUser = listUsers?.users?.find(u => u.email === email);
    if (existingAuthUser) {
      return res.status(400).json({ 
        success: false, 
        emailExists: true,
        comment: "Este e-mail já está associado a uma conta. Por favor, faça login." 
      });
    }

    const random = crypto.randomInt(10000, 100000).toString(); 
    const otpTimeExpire = new Date(Date.now() + 10 * 60 * 1000).toISOString(); 

    // 2. Se não existir, criamos o utilizador temporário no Auth
    const tempPassword = Math.random().toString(36).slice(-8) + "A1!"; 
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({ 
      email: email, 
      password: tempPassword, 
      email_confirm: false 
    }); 

    if (createError) { 
      console.error("Erro ao criar user no Auth:", createError.message); 
      return res.status(400).json({ success: false, comment: "Erro ao criar utilizador: " + createError.message }); 
    } 
    const userId = newUser.user.id; 

    // 3. Guardar OTP no profile
    const { error: profileError } = await supabase 
      .from("profiles") 
      .upsert( 
        { id: userId, email: email, otp: random, otp_time: otpTimeExpire }, 
        { onConflict: 'id' } 
      ); 

    if (profileError) { 
      console.error("Erro ao guardar OTP no profile:", profileError); 
      return res.status(400).json({ success: false, comment: "Erro na BD: " + profileError.message }); 
    } 

    const htmlTemplate = ` 
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px; margin: 0;"> 
        <div style="max-width: 500px; background-color: #ffffff; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"> 
          <div style="background-color: #ff7900; padding: 24px; text-align: center;"> 
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">ORANGE</h1> 
            <p style="color: #fff2e5; margin: 5px 0 0 0; font-size: 13px;">Mercado Bissau - Verificação de Conta</p> 
          </div> 
          <div style="padding: 30px; color: #333333; text-align: center;"> 
            <p style="font-size: 15px; line-height: 1.5; margin-bottom: 20px;">Olá! Utilize o código abaixo para continuar:</p> 
            <div style="background-color: #fff8f0; border: 2px dashed #ff7900; border-radius: 8px; padding: 15px; margin: 20px 0;"> 
              <span style="font-size: 32px; font-weight: bold; color: #ff7900; letter-spacing: 6px;">${random}</span> 
            </div> 
            <p style="font-size: 13px; color: #777777; margin-top: 25px;">Este código expira em 10 minutos.</p> 
          </div> 
        </div> 
      </div>`; 

    const transporter = nodemailer.createTransport({ 
      service: "gmail", 
      auth: { user: process.env.GOOGLEEMAIL, pass: process.env.GOOGLEPASS }, 
    }); 

    const sender = await transporter.sendMail({ 
      from: `"Orange Bissau" <${process.env.GOOGLEEMAIL}>`, 
      to: email, 
      subject: "Código de Verificação - mBissau", 
      html: htmlTemplate, 
    }); 

    if (sender.accepted && sender.accepted.length > 0) { 
      return res.status(200).json({ success: true, message: random, comment: "Email sent successfully" }); 
    } 

    return res.status(400).json({ success: false, comment: "Issue from Nodemailer" }); 
  } catch (error) { 
    return res.status(500).json({ success: false, comment: `Coding error: ${error.message}` }); 
  } 
});

// ========== 2. CONFIRMAR SIGNUP (EMAIL + OTP + TELEFONE) ========== 
router.post("/verify-otp", async (req, res) => { 
  try { 
    const { userEmail, userPhone, otpInput } = req.body; 
    if (!userEmail || !userPhone || !otpInput) { 
      return res.status(400).json({ success: false, comment: "E-mail, telefone e código OTP são obrigatórios" }); 
    } 

    const supabase = getSupabaseAdmin(); 

    const { data: profileData, error: fetchError } = await supabase 
      .from("profiles") 
      .select("id, otp, otp_time") 
      .eq("email", userEmail) 
      .maybeSingle(); 

    if (fetchError || !profileData) { 
      return res.status(400).json({ success: false, comment: "Nenhum registo encontrado para este e-mail. Solicite um novo código." }); 
    } 

    if (!profileData.otp) { 
      return res.status(400).json({ success: false, comment: "Nenhum OTP ativo. Por favor, solicite um novo código." }); 
    } 

    if (String(otpInput).trim() !== String(profileData.otp).trim()) { 
      return res.status(400).json({ success: false, comment: "Código OTP incorreto." }); 
    } 

    const agora = new Date(); 
    const tempoExpiracao = new Date(profileData.otp_time); 
    if (!profileData.otp_time || agora > tempoExpiracao) { 
      return res.status(400).json({ success: false, comment: "O código OTP expirou (passaram mais de 10 minutos). Solicite um novo código." }); 
    } 

    const cleanPhone = userPhone.replace(/\D/g, ""); 
    const userPassword = cleanPhone.slice(-7); 
    if (userPassword.length < 6) { 
      return res.status(400).json({ success: false, comment: "O número precisa de ter pelo menos 6 dígitos finais para a password." }); 
    } 

    let authUserId = profileData.id; 

    // Criação do utilizador no Supabase Auth incluindo o telefone (phone)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({ 
      email: userEmail, 
      password: userPassword, 
      phone: userPhone, 
      email_confirm: true, 
    }); 

    if (authError) { 
      const { data: lista } = await supabase.auth.admin.listUsers({ perPage: 1000 }); 
      const existingUser = lista?.users?.find(u => u.email === userEmail); 
      if (existingUser) { 
        authUserId = existingUser.id; 
        // Atualiza a password e também o telefone no Auth caso já exista
        await supabase.auth.admin.updateUserById(authUserId, { 
          password: userPassword, 
          phone: userPhone 
        }); 
      } else { 
        return res.status(400).json({ success: false, comment: authError.message }); 
      } 
    } else { 
      authUserId = authData.user.id; 
    } 

    // Atualiza a tabela profiles com o ID correto, telefone e limpa o OTP
    const { error: profileError } = await supabase.from("profiles").update({ 
      id: authUserId, 
      phone: userPhone, 
      otp: null, 
      otp_time: null 
    }).eq("email", userEmail); 

    if (profileError) { 
      console.log("Erro ao atualizar profile:", profileError.message); 
    } 

    return res.status(200).json({ 
      success: true, 
      message: "Conta criada com sucesso", 
      comment: "Conta criada com sucesso", 
    }); 

  } catch (e) { 
    return res.status(500).json({ success: false, comment: e.message }); 
  } 
});

// ========== 3. VERIFICAR TEMPO REAL / COUNTDOWN DO OTP NO BACKEND ========== 
router.post("/otp-countdown", async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res.status(400).json({ success: false, comment: "O e-mail é obrigatório." });
    }

    const supabase = getSupabaseAdmin();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("otp, otp_time")
      .eq("email", userEmail)
      .maybeSingle();

    if (error || !profile || !profile.otp_time) {
      return res.status(400).json({ success: false, expired: true, comment: "Nenhum OTP ativo encontrado." });
    }

    const agora = new Date();
    const tempoExpiracao = new Date(profile.otp_time);
    const diffMs = tempoExpiracao - agora;

    if (diffMs <= 0) {
      return res.status(400).json({ 
        success: false, 
        expired: true, 
        remainingSeconds: 0, 
        comment: "O tempo do OTP expirou no servidor." 
      });
    }

    const remainingSeconds = Math.floor(diffMs / 1000);

    return res.status(200).json({
      success: true,
      expired: false,
      remainingSeconds: remainingSeconds,
      comment: "OTP ainda válido em tempo real."
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 5. FORGOT PASSWORD (ENVIAR LINK) ==========
router.post("/forgot-password", async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res.status(400).json({ success: false, comment: "Email é obrigatório" });
    }

    const supabase = getSupabaseAdmin();
    const { data: lista, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      return res.status(400).json({ success: false, comment: listError.message });
    }

    const userExists = lista.users.find((u) => u.email === userEmail);
    if (!userExists) {
      return res.status(400).json({ success: false, comment: "Utilizador não existe" });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/forgot/verify?email=${encodeURIComponent(userEmail)}`;

    const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
            <div style="max-width: 500px; background: #fff; margin: 0 auto; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #ff7900; padding: 24px; text-align: center;">
                    <h1 style="color: #fff; margin: 0;">ORANGE</h1>
                    <p style="color: #fff2e5; margin: 5px 0 0; font-size: 13px;">Recuperação de Palavra-Passe</p>
                </div>
                <div style="padding: 30px; text-align: center;">
                    <p>Clique no botão abaixo para redefinir a sua palavra-passe:</p>
                    <a href="${resetLink}" style="background:#ff7900;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Redefinir Palavra-Passe</a>
                </div>
            </div>
        </div>`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GOOGLEEMAIL, pass: process.env.GOOGLEPASS },
    });

    const sender = await transporter.sendMail({
      from: `"Orange Bissau" <${process.env.GOOGLEEMAIL}>`,
      to: userEmail,
      subject: "Recuperação de Palavra-Passe",
      html: htmlTemplate,
    });

    if (sender.accepted && sender.accepted.length > 0) {
      return res.status(200).json({
        success: true,
        comment: "E-mail de recuperação enviado com sucesso.",
      });
    }
    return res.status(400).json({ success: false, comment: "Erro no envio do e-mail" });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 6. NOVA PASSWORD (ATUALIZAR) ==========
router.post("/verify-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        comment: "E-mail e nova palavra-passe são obrigatórios",
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: lista, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (listError) {
      return res.status(400).json({ success: false, comment: listError.message });
    }

    const user = lista.users.find((u) => u.email === email);
    if (!user) {
      return res.status(404).json({ success: false, comment: "Utilizador não encontrado." });
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) {
      return res.status(400).json({ success: false, comment: error.message });
    }

    return res.status(200).json({ success: true, comment: "Palavra-passe alterada com sucesso!" });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

// ========== 7. APAGAR CONTA (ROBUSTO) ==========
router.delete("/account/buyer/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, comment: "userId é obrigatório." });
    }

    const supabase = getSupabaseAdmin();

    // Limpar tabelas relacionadas com o utilizador
    await apagarLojaEProdutos(supabase, userId);
    await supabase.from("sellers_notifications").delete().eq("seller_id", userId);
    await supabase.from("services").delete().eq("user_id", userId);
    await supabase.from("work_samples").delete().eq("user_id", userId);
    await supabase.from("user_reviews").delete().eq("user_id", userId);

    // Apagar perfil
    await supabase.from("profiles").delete().eq("id", userId);

    // Apagar do Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      return res.status(200).json({
        success: true,
        comment: "Dados apagados do banco, mas falhou remover do Auth: " + authError.message,
      });
    }

    return res.json({
      success: true,
      comment: "Conta e todos os dados relacionados eliminados com sucesso.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, comment: error.message });
  }
});

module.exports = router;