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
                            <button class="status-badge status-${robot.status}" 
                                    style="cursor: pointer; border: none; padding: 5px 10px; border-radius: 15px;"
                                    onclick="UI.changeRobotStatus(${robot.id}, '${robot.status}')"
                                    title="Durumu değiştir">
                                ${robot.status === 'active' ? 'Aktif' : 
                                  robot.status === 'idle' ? 'Beklemede' : 'Bakımda'}
                            </button>
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
                            <button class="btn btn-sm btn-outline-primary" onclick="UI.openUploadModal(${robot.id}, '${robot.name.replace(/'/g, "\\'")}')">
                                <i class="bi bi-upload me-2"></i>Veri Yükle (JSON)
                            </button>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-success" onclick="UI.viewSensorData(${robot.id}, '${robot.name.replace(/'/g, "\\'")}')">
                                    <i class="bi bi-graph-up me-1"></i>Verileri Gör
                                </button>
                                <button class="btn btn-sm btn-outline-info" onclick="UI.simulateData(${robot.id})">
                                    <i class="bi bi-play-fill me-1"></i>Simüle Et
                                </button>
                            </div>
                            <button class="btn btn-sm btn-outline-warning" onclick="UI.downloadRobotReport(${robot.id})">
                                <i class="bi bi-file-earmark-excel me-2"></i>Excel İndir
                            </button>
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

    // Robot durumunu değiştir
    async changeRobotStatus(id, currentStatus) {
        const statuses = ['active', 'idle', 'maintenance'];
        const statusNames = {
            'active': 'Aktif',
            'idle': 'Beklemede',
            'maintenance': 'Bakımda'
        };

        // Mevcut durumu filtrele
        const availableStatuses = statuses.filter(s => s !== currentStatus);
        
        // Modal oluştur
        const modalHtml = `
            <div class="modal fade" id="statusModal" tabindex="-1">
                <div class="modal-dialog modal-sm">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Durum Değiştir</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-3">Yeni durumu seçin:</p>
                            <div class="d-grid gap-2">
                                ${availableStatuses.map(status => `
                                    <button class="btn btn-outline-${status === 'active' ? 'success' : status === 'idle' ? 'warning' : 'secondary'}" 
                                            onclick="UI.updateRobotStatus(${id}, '${status}')">
                                        ${statusNames[status]}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Eski modalı kaldır
        const oldModal = document.getElementById('statusModal');
        if (oldModal) oldModal.remove();

        // Yeni modalı ekle
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('statusModal'));
        modal.show();
    },

    // Robot durumunu güncelle
    async updateRobotStatus(id, newStatus) {
        try {
            await API.updateRobot(id, { status: newStatus });
            
            // Modalı kapat
            const modal = bootstrap.Modal.getInstance(document.getElementById('statusModal'));
            if (modal) modal.hide();
            
            await App.loadRobots();
            UI.showToast('Robot durumu güncellendi!', 'success');
        } catch (error) {
            UI.showToast('Durum güncellenirken hata oluştu!', 'error');
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

    // Tek robot için Excel raporu indir
    async downloadRobotReport(robotId) {
        try {
            UI.showToast('Rapor hazırlanıyor...', 'info');
            
            const response = await fetch(`/api/reports/robot/${robotId}/export`);
            
            if (!response.ok) {
                throw new Error('Rapor oluşturulamadı');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `robot_raporu_${robotId}_${new Date().getTime()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            UI.showToast('Rapor başarıyla indirildi!', 'success');
        } catch (error) {
            UI.showToast('Rapor indirilemedi!', 'error');
            console.error(error);
        }
    },

    // Tüm robotlar için Excel raporu indir
    async downloadAllRobotsReport() {
        try {
            UI.showToast('Toplu rapor hazırlanıyor...', 'info');
            
            const response = await fetch('/api/reports/export-all');
            
            if (!response.ok) {
                throw new Error('Rapor oluşturulamadı');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tum_robotlar_${new Date().getTime()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            UI.showToast('Toplu rapor başarıyla indirildi!', 'success');
        } catch (error) {
            UI.showToast('Rapor indirilemedi!', 'error');
            console.error(error);
        }
    },

    // Raporları modalda görüntüle
    async viewReportsModal() {
        try {
            const data = await API.getReportSummary();
            const container = document.getElementById('reportsTableBody');
            
            if (data.length === 0) {
                container.innerHTML = `
                    <tr>
                        <td colspan="11" class="text-center text-muted">
                            <i class="bi bi-inbox me-2"></i>Henüz robot bulunmuyor
                        </td>
                    </tr>
                `;
            } else {
                container.innerHTML = data.map(robot => `
                    <tr>
                        <td>${robot.id}</td>
                        <td><strong>${robot.name}</strong></td>
                        <td>${robot.model}</td>
                        <td>
                            <span class="status-badge status-${robot.status}">
                                ${robot.status}
                            </span>
                        </td>
                        <td>${robot.battery}%</td>
                        <td>${robot.sensor_count}</td>
                        <td>${robot.avg_temperature} °C</td>
                        <td>${robot.avg_humidity} %</td>
                        <td>${robot.avg_speed} m/s</td>
                        <td><small>${robot.last_reading}</small></td>
                        <td><small>${robot.created_at}</small></td>
                    </tr>
                `).join('');
            }
            
            new bootstrap.Modal(document.getElementById('reportsModal')).show();
        } catch (error) {
            UI.showToast('Raporlar yüklenirken hata oluştu!', 'error');
            console.error(error);
        }
    },

    // Toast bildirim göster
    showToast(message, type = 'success') {
        const toastClass = type === 'success' ? 'bg-success' : 
                          type === 'error' ? 'bg-danger' : 'bg-info';
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