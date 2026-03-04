# Deployment Guide — LinkedIn Profile Analyzer

## Part 1: Backend Deployment (AWS EC2)

### Prerequisites
- AWS account
- A domain name (optional but recommended for SSL)
- OpenAI API key

### Step 1: Launch an EC2 Instance
1. Go to the **AWS EC2 Console** → Launch Instance
2. **AMI:** Ubuntu Server 22.04 LTS
3. **Instance type:** `t2.micro` (free tier) or `t3.micro`
4. **Key pair:** Create or select an existing key pair for SSH
5. **Security group:** Allow inbound traffic on:
   - Port **22** (SSH)
   - Port **80** (HTTP)
   - Port **443** (HTTPS)
6. **Storage:** 8 GB gp3 is sufficient
7. Launch the instance and note its **Public IP** or **Elastic IP**

### Step 2: SSH into the Instance
```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### Step 3: Run the Setup Script
```bash
# Clone the repo and run setup (replace with your repo URL and domain)
curl -sL https://raw.githubusercontent.com/<user>/<repo>/main/deploy/ec2-setup.sh -o ec2-setup.sh
sudo bash ec2-setup.sh https://github.com/<user>/<repo>.git your-domain.com
```

Or if you prefer to do it manually:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx git

sudo git clone https://github.com/<user>/<repo>.git /opt/linkedin-analyzer
cd /opt/linkedin-analyzer
```

### Step 4: Configure Environment Variables
```bash
sudo nano /opt/linkedin-analyzer/backend/.env
```
Set your API key:
```
OPENAI_API_KEY=sk-your-actual-key
OPENAI_MODEL=gpt-4o-mini
```

### Step 5: Start the Application
```bash
cd /opt/linkedin-analyzer
sudo docker compose up -d --build
```

Verify it's running:
```bash
curl http://localhost:8000/health
# Expected: {"status":"ok"}
```

### Step 6: Configure Nginx
The setup script copies the Nginx config automatically. If doing it manually:
```bash
sudo cp nginx/default.conf /etc/nginx/sites-available/default
# Edit the file and replace "your-domain.com" with your actual domain
sudo nano /etc/nginx/sites-available/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Set Up SSL (Optional but Recommended)
Point your domain's DNS A record to the EC2 public IP, then:
```bash
sudo certbot --nginx -d your-domain.com
```
Certbot will automatically configure the HTTPS server block. Verify:
```bash
curl https://your-domain.com/health
```

### Step 8: Update the Extension
After deployment, update `extension/background.js`:
```js
const API_BASE = "https://your-domain.com";
```
And add your domain to `extension/manifest.json` `host_permissions`:
```json
"host_permissions": ["https://www.linkedin.com/*", "https://your-domain.com/*"]
```

---

## Part 2: Chrome Web Store Publishing

### Step 1: Create a Developer Account
1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay the one-time **$5 registration fee**
3. Complete your developer profile

### Step 2: Package the Extension
Run the packaging script:
```bash
bash deploy/package-extension.sh
```
This creates `linkedin-profile-analyzer.zip` in the project root.

### Step 3: Upload to Chrome Web Store
1. In the Developer Dashboard, click **New Item**
2. Upload `linkedin-profile-analyzer.zip`
3. Fill in the listing details:
   - **Name:** LinkedIn Profile Analyzer
   - **Description:** AI-powered LinkedIn profile analysis with strength scoring and job matching
   - **Category:** Productivity
   - **Language:** English
4. Upload screenshots (1280x800 or 640x400)
5. Add a promotional tile image (440x280)

### Step 4: Submit for Review
1. Review the listing preview
2. Click **Submit for Review**
3. Google typically reviews within 1–3 business days
4. You'll receive an email when the extension is approved or if changes are needed

---

## Useful Commands

```bash
# View logs
cd /opt/linkedin-analyzer && sudo docker compose logs -f

# Restart the app
sudo docker compose restart

# Rebuild after code changes
sudo docker compose up -d --build

# Stop everything
sudo docker compose down

# Renew SSL certificate (auto-renews, but manual command)
sudo certbot renew
```
