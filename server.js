import express from 'express';

const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.post('/api/send-otp', async (req, res) => {
  const { email, code, reason } = req.body;

  if (!email || !code || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Email validation
  const emailRegex = /^(?=.{3,254}$)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BR ONLINE <onboarding@resend.dev>',
        to: [email],
        subject: `BR ONLINE: одноразовый код (${reason})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #10b981 100%); border-radius: 16px; padding: 2px;">
              <div style="background: white; border-radius: 14px; padding: 40px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1 0%, #10b981 100%); border-radius: 16px; margin-bottom: 20px; color: white; font-weight: 800; font-size: 24px; line-height: 60px;">BR</div>
                  <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #1e293b;">BR ONLINE</h1>
                  <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Мониторинг игровых серверов</p>
                </div>
                
                <div style="text-align: center; margin: 40px 0;">
                  <p style="margin: 0 0 20px; color: #334155; font-size: 16px;">Ваш одноразовый код для <strong>${reason}</strong>:</p>
                  <div style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 12px; padding: 24px; margin: 20px 0;">
                    <div style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #1e293b; font-family: 'Courier New', monospace;">${code}</div>
                  </div>
                  <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Код действителен в течение 10 минут</p>
                </div>
                
                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
                  <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">Если вы не запрашивали этот код, просто проигнорируйте это письмо.</p>
                </div>
              </div>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend error:', error);
      throw new Error(`Resend API error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    console.error('Email sending failed:', error);
    return res.status(500).json({ error: 'Failed to send email', message: error.message });
  }
});

// Email verification endpoint (optional - for custom verification emails)
app.post('/api/send-verification', async (req, res) => {
  const { email, verificationUrl } = req.body;

  if (!email || !verificationUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const emailRegex = /^(?=.{3,254}$)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BR ONLINE <onboarding@resend.dev>',
        to: [email],
        subject: 'BR ONLINE: Подтверждение email',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #10b981 100%); border-radius: 16px; padding: 2px;">
              <div style="background: white; border-radius: 14px; padding: 40px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1 0%, #10b981 100%); border-radius: 16px; margin-bottom: 20px; color: white; font-weight: 800; font-size: 24px; line-height: 60px;">BR</div>
                  <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #1e293b;">BR ONLINE</h1>
                  <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Мониторинг игровых серверов</p>
                </div>
                
                <div style="text-align: center; margin: 40px 0;">
                  <p style="margin: 0 0 20px; color: #334155; font-size: 16px;">Для завершения регистрации подтвердите ваш email:</p>
                  <div style="margin: 30px 0;">
                    <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #10b981 100%); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; transition: all 0.3s ease;">
                      Подтвердить Email
                    </a>
                  </div>
                  <p style="margin: 20px 0 0; color: #64748b; font-size: 14px;">Или скопируйте ссылку в браузер:</p>
                  <p style="margin: 10px 0 0; color: #334155; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
                </div>
                
                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
                  <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">Если вы не регистрировались в BR ONLINE, просто проигнорируйте это письмо.</p>
                </div>
              </div>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend error:', error);
      throw new Error(`Resend API error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    console.error('Verification email sending failed:', error);
    return res.status(500).json({ error: 'Failed to send verification email', message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});