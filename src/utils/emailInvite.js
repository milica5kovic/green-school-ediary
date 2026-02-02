export const sendInviteEmail = async (supabase, email, fullName, role) => {
  try {
    // Generate a random temporary password
    const tempPassword = generateTempPassword();
    
    // Create auth user with temporary password
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role
      }
    });

    if (authError) throw authError;

    // Send email with credentials (you'll need to set up email service)
    const emailBody = `
Hello ${fullName},

Your Green School E-Diary account has been created!

Login credentials:
Email: ${email}
Temporary Password: ${tempPassword}

Please log in at: https://your-app-url.com/login

After logging in, please change your password in Settings.

Best regards,
Green School Administration
    `;

    // TODO: Integrate with your email service (SendGrid, AWS SES, etc.)
    console.log('Email to send:', emailBody);
    
    // For now, just show alert with credentials (TEMPORARY - for development only)
    alert(`User created!\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nIn production, this will be sent via email.`);
    
    return { success: true, userId: authData.user.id };
  } catch (error) {
    console.error('Error sending invite:', error);
    throw error;
  }
};

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};