"""
邮件发送服务
"""
import os
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()


class EmailService:
    """邮件发送服务类"""
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("SMTP_FROM_EMAIL", self.smtp_user)
        self.from_name = os.getenv("SMTP_FROM_NAME", "DeepBrain Tech")
    
    async def send_email(self, to_email: str, subject: str, html_content: str):
        """
        发送邮件
        
        Args:
            to_email: 收件人邮箱
            subject: 邮件主题
            html_content: 邮件HTML内容
        """
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{self.from_name} <{self.from_email}>"
        message["To"] = to_email
        
        # 添加HTML内容
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # 发送邮件
        try:
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True
            )
            return True
        except Exception as e:
            print(f"发送邮件失败: {str(e)}")
            return False
    
    async def send_verification_code(self, to_email: str, code: str, language: str = "zh"):
        """
        发送验证码邮件
        
        Args:
            to_email: 收件人邮箱
            code: 验证码
            language: 语言（zh或en）
        """
        if language == "zh":
            subject = "DeepBrain Tech - 注册验证码"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
                        <h1 style="color: white; margin: 0;">DeepBrain Tech</h1>
                    </div>
                    <div style="background-color: #f7f7f7; padding: 30px; border-radius: 10px; margin-top: 20px;">
                        <h2 style="color: #333; margin-top: 0;">您好！</h2>
                        <p style="color: #666; font-size: 16px; line-height: 1.6;">
                            感谢您注册 DeepBrain Tech 平台。您的验证码是：
                        </p>
                        <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                            <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">
                                {code}
                            </span>
                        </div>
                        <p style="color: #666; font-size: 14px; line-height: 1.6;">
                            此验证码将在 <strong>5分钟</strong> 后失效，请尽快使用。
                        </p>
                        <p style="color: #999; font-size: 12px; margin-top: 30px;">
                            如果这不是您的操作，请忽略此邮件。
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                        <p>© 2025 DeepBrain Tech. 保留所有权利。</p>
                    </div>
                </body>
            </html>
            """
        else:
            subject = "DeepBrain Tech - Verification Code"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
                        <h1 style="color: white; margin: 0;">DeepBrain Tech</h1>
                    </div>
                    <div style="background-color: #f7f7f7; padding: 30px; border-radius: 10px; margin-top: 20px;">
                        <h2 style="color: #333; margin-top: 0;">Hello!</h2>
                        <p style="color: #666; font-size: 16px; line-height: 1.6;">
                            Thank you for registering with DeepBrain Tech. Your verification code is:
                        </p>
                        <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                            <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">
                                {code}
                            </span>
                        </div>
                        <p style="color: #666; font-size: 14px; line-height: 1.6;">
                            This verification code will expire in <strong>5 minutes</strong>. Please use it soon.
                        </p>
                        <p style="color: #999; font-size: 12px; margin-top: 30px;">
                            If you didn't request this, please ignore this email.
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                        <p>© 2025 DeepBrain Tech. All rights reserved.</p>
                    </div>
                </body>
            </html>
            """
        
        return await self.send_email(to_email, subject, html_content)


# 创建全局邮件服务实例
email_service = EmailService()
