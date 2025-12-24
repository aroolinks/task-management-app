# Task Management App

A modern task management application built with Next.js 15, React 19, TypeScript, and MongoDB.

## Features

- ✅ Create, read, update, delete tasks
- 🎯 Priority levels (Low, Medium, High, Urgent)
- 📊 Status tracking (Completed, InProcess, Waiting for Quote)
- 🔧 CMS categorization (WordPress, Shopify, Designing, SEO, Marketing)
- 💰 Price and deposit tracking
- 📅 Due date management
- 🔐 User authentication with JWT
- 👥 User and group management
- 🎨 Modern UI with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with jose library
- **Deployment**: Vercel
- **Linting**: ESLint

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm or yarn
- MongoDB Atlas account

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd task-management-app-netlify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/taskmanager?retryWrites=true&w=majority
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Deployment on Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/task-management-app)

### Manual Deployment

1. **Install Vercel CLI** (optional)
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**
   - Go to your Vercel dashboard
   - Select your project
   - Navigate to Settings → Environment Variables
   - Add: `MONGODB_URI` with your MongoDB connection string

4. **Redeploy**
   - Push changes to trigger automatic deployment, or
   - Use `vercel --prod` to deploy manually

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB Atlas connection string | Yes |
| `NODE_ENV` | Environment (automatically set by Vercel) | No |

## API Routes

- `GET /api/health` - Health check and MongoDB connection status
- `GET /api/tasks` - Fetch all tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/[id]` - Update a task
- `DELETE /api/tasks/[id]` - Delete a task

## Troubleshooting

### MongoDB Connection Issues
1. Verify `MONGODB_URI` is set correctly in Vercel Environment Variables
2. Check MongoDB Atlas network access (allow your IP or use 0.0.0.0/0)
3. Ensure database user has proper permissions
4. Test connection with `/api/health` endpoint
