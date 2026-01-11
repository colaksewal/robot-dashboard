// API İşlemleri
const API = {
    // Robot işlemleri
    async getRobots() {
        const response = await fetch('/api/robots');
        return await response.json();
    },

    async addRobot(name, model) {
        const response = await fetch('/api/robots', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, model})
        });
        return await response.json();
    },

    async deleteRobot(id) {
        const response = await fetch(`/api/robots/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    },

    async updateRobot(id, data) {
        const response = await fetch(`/api/robots/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    // Sensor işlemleri
    async getSensorData(robotId) {
        const response = await fetch(`/api/sensors/${robotId}`);
        return await response.json();
    },

    async simulateData(robotId) {
        const response = await fetch(`/api/simulate/${robotId}`, {
            method: 'POST'
        });
        return await response.json();
    },

    async uploadSensorData(robotId, jsonData) {
        const response = await fetch(`/api/robots/${robotId}/upload-sensors`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(jsonData)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Yükleme hatası');
        }
        return result;
    },

    async bulkUploadSensors(jsonData) {
        const response = await fetch('/api/robots/bulk-upload', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(jsonData)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Toplu yükleme hatası');
        }
        return result;
    },

    // İstatistikler
    async getStats() {
        const response = await fetch('/api/stats');
        return await response.json();
    }
};