const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'data', 'cases.json');

// 确保数据目录存在
if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// 初始化数据文件
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// 获取所有案例
app.get('/api/cases', (req, res) => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const cases = JSON.parse(data);
        res.json(cases);
    } catch (error) {
        console.error('Error reading cases:', error);
        res.status(500).json({ error: 'Failed to read cases' });
    }
});

// 获取单个案例
app.get('/api/cases/:id', (req, res) => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const cases = JSON.parse(data);
        const caseItem = cases.find(c => c.id === req.params.id);
        
        if (!caseItem) {
            return res.status(404).json({ error: 'Case not found' });
        }
        
        res.json(caseItem);
    } catch (error) {
        console.error('Error reading case:', error);
        res.status(500).json({ error: 'Failed to read case' });
    }
});

// 创建新案例
app.post('/api/cases', (req, res) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const cases = JSON.parse(data);
        
        const newCase = {
            id: Date.now().toString(),
            title,
            content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        cases.unshift(newCase);
        fs.writeFileSync(DATA_FILE, JSON.stringify(cases, null, 2));
        
        res.status(201).json(newCase);
    } catch (error) {
        console.error('Error creating case:', error);
        res.status(500).json({ error: 'Failed to create case' });
    }
});

// 更新案例
app.put('/api/cases/:id', (req, res) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        let cases = JSON.parse(data);
        
        const index = cases.findIndex(c => c.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Case not found' });
        }
        
        cases[index] = {
            ...cases[index],
            title,
            content,
            updatedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(cases, null, 2));
        
        res.json(cases[index]);
    } catch (error) {
        console.error('Error updating case:', error);
        res.status(500).json({ error: 'Failed to update case' });
    }
});

// 删除案例
app.delete('/api/cases/:id', (req, res) => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        let cases = JSON.parse(data);
        
        const index = cases.findIndex(c => c.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Case not found' });
        }
        
        cases.splice(index, 1);
        fs.writeFileSync(DATA_FILE, JSON.stringify(cases, null, 2));
        
        res.json({ message: 'Case deleted successfully' });
    } catch (error) {
        console.error('Error deleting case:', error);
        res.status(500).json({ error: 'Failed to delete case' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('API endpoints:');
    console.log('  GET    /api/cases          - 获取所有案例');
    console.log('  GET    /api/cases/:id      - 获取单个案例');
    console.log('  POST   /api/cases          - 创建新案例');
    console.log('  PUT    /api/cases/:id      - 更新案例');
    console.log('  DELETE /api/cases/:id      - 删除案例');
});