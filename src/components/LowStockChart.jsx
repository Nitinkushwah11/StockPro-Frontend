import React from 'react';

const LowStockChart = ({ movements }) => {
  return (
    <div className="card border-0 shadow-sm rounded-1 mb-4">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="fw-bold text-primary mb-0 fs-6">Stock Movements</h5>
            <p className="text-muted small mb-0" style={{ fontSize: '0.8rem' }}>In vs Out volume - Last 7 Days</p>
          </div>
          <div className="d-flex gap-4">
            <div className="d-flex align-items-center gap-2">
              <span className="rounded-circle bg-primary" style={{ width: '12px', height: '12px' }}></span>
              <span className="text-secondary fw-bold" style={{ fontSize: '0.7rem' }}>STOCK IN</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="rounded-circle border border-secondary" style={{ width: '12px', height: '12px', backgroundColor: '#d8e1ea' }}></span>
              <span className="text-secondary fw-bold" style={{ fontSize: '0.7rem' }}>STOCK OUT</span>
            </div>
          </div>
        </div>

        {/* Chart Visualization */}
        <div className="position-relative d-flex justify-content-between align-items-end border-bottom" style={{ height: '200px' }} role="region" aria-label="Stock Movements Chart">
          {/* Grid lines */}
          <div className="position-absolute w-100 top-0 border-bottom" style={{ borderColor: '#e9ecef', opacity: 0.5 }}></div>
          <div className="position-absolute w-100 border-bottom" style={{ top: '25%', borderColor: '#e9ecef', opacity: 0.5 }}></div>
          <div className="position-absolute w-100 border-bottom" style={{ top: '50%', borderColor: '#e9ecef', opacity: 0.5 }}></div>
          <div className="position-absolute w-100 border-bottom" style={{ top: '75%', borderColor: '#e9ecef', opacity: 0.5 }}></div>

          {/* Dynamic Columns based on movements data */}
          {(() => {
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const chartData = days.map((day, idx) => {
              const today = new Date();
              const d = new Date();
              d.setDate(today.getDate() - (6 - idx)); 
              const dateStr = d.toISOString().split('T')[0];
              
              const dayMovs = movements.filter(m => m.movementDate && m.movementDate.startsWith(dateStr));
              const stockIn = dayMovs.filter(m => m.movementType === 'STOCK_IN').reduce((acc, curr) => acc + curr.quantity, 0);
              const stockOut = dayMovs.filter(m => m.movementType === 'STOCK_OUT').reduce((acc, curr) => acc + curr.quantity, 0);
              
              const maxVal = Math.max(...movements.map(m => m.quantity), 100);
              return {
                day: days[d.getDay()],
                inH: `${Math.min((stockIn / maxVal) * 100, 100)}%`,
                outH: `${Math.min((stockOut / maxVal) * 100, 100)}%`,
                inQty: stockIn,
                outQty: stockOut
              };
            });

            return chartData.map((data, index) => (
              <div key={index} className="d-flex flex-column align-items-center z-1 flex-grow-1" title={`In: ${data.inQty}, Out: ${data.outQty}`}>
                <div className="d-flex align-items-end gap-1 mb-2 w-100 justify-content-center" style={{ height: '160px' }}>
                  <div className="bg-primary rounded-top transition-all" style={{ width: '24px', height: data.inH }}></div>
                  <div className="rounded-top transition-all" style={{ width: '24px', height: data.outH, backgroundColor: '#d8e1ea' }}></div>
                </div>
                <span className="text-secondary fw-bold" style={{ fontSize: '0.65rem' }}>{data.day}</span>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};

export default LowStockChart;
