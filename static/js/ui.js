// UI İşlemleri
const UI = {
    currentRobotId: null,
    currentChart: null,

    // İstatistikleri güncelle
    updateStats(robots) {
        document.getElementById('totalRobots').textContent = robots.length;
        document.getElementById('activeRobots').textContent = 
            robots.filter(r => r.status === 'active').length;
        document.getElementById('idleRobots').textContent = 
            robots.filter(r => r.status === 'idle').length;
        
        const avgBattery = robots.length > 0 
            ? robots.reduce((sum, r) => sum + r.battery, 0) / robots.length 
            : 0;
        document.getElementById('avgBattery').textContent = Math.round(avgBattery) + '%';
    },

    // Robot kartlarını render et
    renderRobots(robots) {
        const container = document.getElementById('robotsContainer');
        
        if (robots.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info text-center">
                        <i class="bi bi-info-circle me-2"></i>
                        Henüz robot eklenmemiş. "Yeni Robot" butonuna tıklayarak başlayın!
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = robots.map(robot => `
            <div class="col-md-4">
                <div class="robot-card card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h5 class="card-title mb-1">${robot.name}</h5>
                                <small class="text-muted">${robot.model}</small>
                            </div>
                            <span class="status-badge status-${robot.status}">
                                ${robot.status === 'active' ? 'Aktif' : 
                                  robot.status === 'idle' ? 'Beklemede' : 'Bakımda'}
                            </span>
                        </div>
                        <div class="mb-2">
                            <small class="text-muted">Batarya: ${robot.battery}%</small>
                            <div class="battery-bar">
                                <div class="battery-fill" style="width: ${robot.battery}%"></div>
                            </div>
                        </div>
                        <small class="text-muted d-block mb-3">
                            <i class="bi bi-calendar me-1"></i>Oluşturulma: ${robot.created_at}
                        </small>
                        <div class="d-grid gap-2 mt-3">
                            <button class="btn btn-sm btn-outline-primary" onclick="UI.openUploadModal(${robot.id}, '${robot.name}')">
                                <i class="bi bi-upload me-2"></i>Veri Yükle (JSON)
                            </button>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-success" onclick="UI.viewSensorData(${robot.id}, '${robot.name}')">
                                    <i class="bi bi-graph-up me-1"></i>Verileri Gör
                                </button>
                                <button class="btn btn-sm btn-outline-info" onclick="UI.simulateData(${robot.id})">
                                    <i class="bi bi-play-fill me-1"></i>Simüle Et
                                </button>
                            </div>
                            <button class="btn btn-sm btn-outline-danger" onclick="UI.deleteRobot(${robot.id})">
                                <i class="bi bi-trash me-2"></i>Sil
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // Robot ekleme modalını aç
    openAddRobotModal() {
        document.getElementById('robotName').value = '';
        document.getElementById('robotModel').value = '';
        new bootstrap.Modal(document.getElementById('addRobotModal')).show();
    },

    // Robot ekle
    async addRobot() {
        const name = document.getElementById('robotName').value.trim();
        const model = document.getElementById('robotModel').value.trim();
        
        if (!name || !model) {
            alert('Lütfen tüm alanları doldurun!');
            return;
        }

        try {
            await API.addRobot(name, model);
            bootstrap.Modal.getInstance(document.getElementById('addRobotModal')).hide();
            await App.loadRobots();
            UI.showToast('Robot başarıyla eklendi!', 'success');
        } catch (error) {
            UI.showToast('Robot eklenirken hata oluştu!', 'error');
        }
    },

    // Robot sil
    async deleteRobot(id) {
        if (!confirm('Bu robotu silmek istediğinize emin misiniz?')) {
            return;
        }

        try {
            await API.deleteRobot(id);
            await App.loadRobots();
            UI.showToast('Robot başarıyla silindi!', 'success');
        } catch (error) {
            UI.showToast('Robot silinirken hata oluştu!', 'error');
        }
    },

    // Veri simüle et
    async simulateData(id) {
        try {
            await API.simulateData(id);
            await App.loadRobots();
            UI.showToast('Sensor verisi simüle edildi!', 'success');
        } catch (error) {
            UI.showToast('Simülasyon hatası!', 'error');
        }
    },

    // Upload modalını aç
    openUploadModal(robotId, robotName) {
        this.currentRobotId = robotId;
        document.getElementById('currentRobotName').textContent = robotName;
        document.getElementById('uploadResult').innerHTML = '';
        new bootstrap.Modal(document.getElementById('uploadSensorModal')).show();
    },

    // Sensor verilerini görüntüle
    async viewSensorData(robotId, robotName) {
        try {
            const sensors = await API.getSensorData(robotId);
            const container = document.getElementById('sensorDataContainer');

            if (sensors.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Henüz sensor verisi yok. JSON dosyası yükleyin veya simüle edin.
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <h6 class="mb-3">${robotName} - Son ${sensors.length} Ölçüm</h6>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${sensors.map((s, i) => `
                            <div class="sensor-item">
                                <strong>#${i + 1}</strong> - 
                                🌡️ ${s.temperature}°C | 
                                💧 ${s.humidity}% | 
                                ⚡ ${s.speed} m/s | 
                                <small class="text-muted">${s.timestamp}</small>
                            </div>
                        `).join('')}
                    </div>
                `;

                // Grafik çiz
                this.drawChart(sensors);
            }

            new bootstrap.Modal(document.getElementById('viewSensorModal')).show();
        } catch (error) {
            UI.showToast('Sensor verileri yüklenirken hata oluştu!', 'error');
        }
    },

    // Grafik çiz
    drawChart(sensors) {
        const ctx = document.getElementById('sensorChart').getContext('2d');
        
        // Eski grafiği temizle
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const reversedSensors = [...sensors].reverse();

        this.currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: reversedSensors.map(s => s.timestamp),
                datasets: [
                    {
                        label: 'Sıcaklık (°C)',
                        data: reversedSensors.map(s => s.temperature),
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Nem (%)',
                        data: reversedSensors.map(s => s.humidity),
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Hız (m/s)',
                        data: reversedSensors.map(s => s.speed),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Sensor Verileri Grafiği'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    },

    // Toast bildirim göster
    showToast(message, type = 'success') {
        const toastClass = type === 'success' ? 'bg-success' : 'bg-danger';
        const toast = document.createElement('div');
        toast.className = `position-fixed bottom-0 end-0 m-3 p-3 ${toastClass} text-white rounded`;
        toast.style.zIndex = '9999';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
};