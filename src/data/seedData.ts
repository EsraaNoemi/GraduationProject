import type {
  AgentRun,
  AgentStep,
  AuditLog,
  Branch,
  Category,
  InventoryBalance,
  InventoryLocation,
  OperationsState,
  Order,
  OrderItem,
  Product,
  ReorderDraft,
  ReorderDraftItem,
  StockMovement,
  StockTransfer,
  StockTransferItem,
  User,
  Warehouse,
} from '../types/domain.ts';

// ----------------------------------------------------------------------------
// 1. Locations, Branches & Warehouses (ERD-v1.dbml)
// ----------------------------------------------------------------------------

const SEED_BRANCHES: Branch[] = [
  {
    id: 1,
    name: 'Abdali Retail Branch',
    address: 'Al-Abdali Boulevard, Bldg 14, Amman, Jordan',
    created_at: '2026-01-10T08:00:00+03:00',
  },
  {
    id: 2,
    name: 'Irbid Distribution Hub',
    address: 'King Abdullah II St, Industrial District, Irbid, Jordan',
    created_at: '2026-01-12T08:00:00+03:00',
  },
];

const SEED_WAREHOUSES: Warehouse[] = [
  {
    id: 1,
    name: 'Amman Main Warehouse',
    address: 'Sahab Industrial Zone, Gate 3, Amman, Jordan',
    created_at: '2026-01-05T08:00:00+03:00',
  },
];

const SEED_LOCATIONS: InventoryLocation[] = [
  {
    id: 1,
    code: 'LOC-1',
    name: 'Amman Main Warehouse',
    location_type: 'WAREHOUSE',
    branch_id: null,
    warehouse_id: 1,
  },
  {
    id: 2,
    code: 'LOC-2',
    name: 'Abdali Retail Branch',
    location_type: 'BRANCH',
    branch_id: 1,
    warehouse_id: null,
  },
  {
    id: 3,
    code: 'LOC-3',
    name: 'Irbid Distribution Hub',
    location_type: 'BRANCH',
    branch_id: 2,
    warehouse_id: null,
  },
];

// ----------------------------------------------------------------------------
// 2. Users (RBAC: EMPLOYEE vs. MANAGER)
// ----------------------------------------------------------------------------

const SEED_USERS: User[] = [
  {
    id: 1,
    full_name: 'Tariq Haddad',
    email: 't.haddad@ops-agent.jo',
    role: 'EMPLOYEE',
    assigned_location_id: 2,
  },
  {
    id: 2,
    full_name: 'Esraa Al Noaiami',
    email: 'e.alnoaiami@ops-agent.jo',
    role: 'MANAGER',
    assigned_location_id: 1,
  },
];

// ----------------------------------------------------------------------------
// 3. Categories & Products (5 Categories, 16 Realistic SKUs)
// ----------------------------------------------------------------------------

const SEED_CATEGORIES: Category[] = [
  { id: 1, name: 'Networking & Cables' },
  { id: 2, name: 'Office Peripherals' },
  { id: 3, name: 'Thermal & Print Supplies' },
  { id: 4, name: 'Storage & Media' },
  { id: 5, name: 'Packaging & Dispatch' },
];

const SEED_PRODUCTS: Product[] = [
  {
    id: 1,
    category_id: 3,
    sku: 'THM-RCP-8080',
    name: 'Thermal Receipt Paper 80mm x 80mm',
    description: 'BPA-free direct thermal POS receipt rolls, 55gsm core 12mm.',
    unit: 'roll',
    reorder_threshold: 25,
    default_reorder_qty: 60,
    unit_cost_jod: 1.45,
    supplier_name: 'Al-Noor Paper Industries',
    created_at: '2026-01-15T09:00:00+03:00',
  },
  {
    id: 2,
    category_id: 3,
    sku: 'THM-LBL-8050',
    name: 'Thermal Barcode Label Roll 80mm x 50mm',
    description: 'Perforated adhesive direct thermal paper labels for shipping & SKUs (500/roll).',
    unit: 'roll',
    reorder_threshold: 15,
    default_reorder_qty: 40,
    unit_cost_jod: 3.8,
    supplier_name: 'Al-Noor Paper Industries',
    created_at: '2026-01-15T09:05:00+03:00',
  },
  {
    id: 3,
    category_id: 3,
    sku: 'THM-RBN-110',
    name: 'Thermal Transfer Wax Ribbon 110mm x 300m',
    description: 'Standard resin-enhanced wax ribbon for desktop label printers.',
    unit: 'roll',
    reorder_threshold: 10,
    default_reorder_qty: 25,
    unit_cost_jod: 5.25,
    supplier_name: 'Al-Noor Paper Industries',
    created_at: '2026-01-15T09:10:00+03:00',
  },
  {
    id: 4,
    category_id: 1,
    sku: 'NET-UTP-5M',
    name: 'Cat6 UTP Patch Cable 5m',
    description: 'Unshielded twisted pair Gigabit Ethernet patch cord, snagless boot.',
    unit: 'pcs',
    reorder_threshold: 20,
    default_reorder_qty: 50,
    unit_cost_jod: 2.9,
    supplier_name: 'Levant Network Systems',
    created_at: '2026-01-16T10:00:00+03:00',
  },
  {
    id: 5,
    category_id: 1,
    sku: 'NET-SFTP-5M',
    name: 'Cat6 SFTP Shielded Cable 5m',
    description: 'Double-shielded industrial Cat6 patch cord for high-EMI racks.',
    unit: 'pcs',
    reorder_threshold: 12,
    default_reorder_qty: 30,
    unit_cost_jod: 4.75,
    supplier_name: 'Levant Network Systems',
    created_at: '2026-01-16T10:05:00+03:00',
  },
  {
    id: 6,
    category_id: 1,
    sku: 'NET-SW8-GB',
    name: '8-Port Gigabit Desktop Switch',
    description: 'Fanless metal-chassis unmanaged 10/100/1000Mbps Ethernet switch.',
    unit: 'pcs',
    reorder_threshold: 6,
    default_reorder_qty: 15,
    unit_cost_jod: 24.5,
    supplier_name: 'Levant Network Systems',
    created_at: '2026-01-16T10:15:00+03:00',
  },
  {
    id: 7,
    category_id: 1,
    sku: 'NET-RJ45-100',
    name: 'RJ45 Cat6 Modular Plugs (100-Pack)',
    description: 'Gold-plated 8P8C pass-through crimp connectors, jar of 100.',
    unit: 'pack',
    reorder_threshold: 8,
    default_reorder_qty: 20,
    unit_cost_jod: 6.4,
    supplier_name: 'Levant Network Systems',
    created_at: '2026-01-16T10:25:00+03:00',
  },
  {
    id: 8,
    category_id: 2,
    sku: 'PER-SCN-WL',
    name: 'Logitech Wireless Barcode Scanner',
    description: '2D handheld cordless barcode reader with USB charging cradle.',
    unit: 'pcs',
    reorder_threshold: 8,
    default_reorder_qty: 20,
    unit_cost_jod: 68.0,
    supplier_name: 'Petra Tech Distribution',
    created_at: '2026-01-18T11:00:00+03:00',
  },
  {
    id: 9,
    category_id: 2,
    sku: 'PER-PRT-POS',
    name: 'Epson 80mm USB/LAN Thermal Printer',
    description: 'High-speed 250mm/s auto-cutter POS receipt printer.',
    unit: 'pcs',
    reorder_threshold: 6,
    default_reorder_qty: 12,
    unit_cost_jod: 145.0,
    supplier_name: 'Petra Tech Distribution',
    created_at: '2026-01-18T11:10:00+03:00',
  },
  {
    id: 10,
    category_id: 2,
    sku: 'PER-KB-USB',
    name: 'Ergonomic Wired Office Keyboard',
    description: 'Spill-resistant Arabic/English layout USB business keyboard.',
    unit: 'pcs',
    reorder_threshold: 10,
    default_reorder_qty: 25,
    unit_cost_jod: 11.5,
    supplier_name: 'Petra Tech Distribution',
    created_at: '2026-01-18T11:20:00+03:00',
  },
  {
    id: 11,
    category_id: 2,
    sku: 'PER-MS-WL',
    name: '2.4GHz Wireless Optical Mouse',
    description: 'Silent-click 1600 DPI ergonomic wireless mouse with nano receiver.',
    unit: 'pcs',
    reorder_threshold: 12,
    default_reorder_qty: 30,
    unit_cost_jod: 8.75,
    supplier_name: 'Petra Tech Distribution',
    created_at: '2026-01-18T11:30:00+03:00',
  },
  {
    id: 12,
    category_id: 4,
    sku: 'STR-SSD-1T',
    name: 'NVMe M.2 Internal SSD 1TB',
    description: 'PCIe Gen4 x4 M.2 2280 solid state drive, 3500MB/s read.',
    unit: 'pcs',
    reorder_threshold: 5,
    default_reorder_qty: 15,
    unit_cost_jod: 58.0,
    supplier_name: 'Amman Silicon Supply',
    created_at: '2026-01-20T09:00:00+03:00',
  },
  {
    id: 13,
    category_id: 4,
    sku: 'STR-USB-64G',
    name: 'USB 3.2 Flash Drive 64GB',
    description: 'Metal casing capless USB-A flash drive for field backups.',
    unit: 'pcs',
    reorder_threshold: 15,
    default_reorder_qty: 40,
    unit_cost_jod: 5.5,
    supplier_name: 'Amman Silicon Supply',
    created_at: '2026-01-20T09:15:00+03:00',
  },
  {
    id: 14,
    category_id: 4,
    sku: 'STR-HDD-4T',
    name: 'Enterprise NAS Hard Drive 4TB',
    description: '7200RPM 3.5-inch CMR NAS drive rated for 24/7 operation.',
    unit: 'pcs',
    reorder_threshold: 4,
    default_reorder_qty: 10,
    unit_cost_jod: 92.0,
    supplier_name: 'Amman Silicon Supply',
    created_at: '2026-01-20T09:30:00+03:00',
  },
  {
    id: 15,
    category_id: 5,
    sku: 'PKG-BOX-MD',
    name: 'Corrugated Shipping Carton 40x30x25cm',
    description: 'Double-wall kraft corrugated dispatch box for branch transfers.',
    unit: 'pcs',
    reorder_threshold: 30,
    default_reorder_qty: 100,
    unit_cost_jod: 0.95,
    supplier_name: 'Jordan Carton & Pack Co.',
    created_at: '2026-01-22T12:00:00+03:00',
  },
  {
    id: 16,
    category_id: 5,
    sku: 'PKG-TAPE-48',
    name: 'Heavy-Duty Acrylic Packing Tape 48mm (6-Roll)',
    description: 'High-tack 50-micron clear carton sealing tape, pack of 6 rolls.',
    unit: 'pack',
    reorder_threshold: 10,
    default_reorder_qty: 30,
    unit_cost_jod: 4.2,
    supplier_name: 'Jordan Carton & Pack Co.',
    created_at: '2026-01-22T12:15:00+03:00',
  },
];

// ----------------------------------------------------------------------------
// 4. Multi-Location Inventory Balances (16 SKUs x 3 Locations = 48 Rows)
// ----------------------------------------------------------------------------

const SEED_INVENTORY_BALANCES: InventoryBalance[] = [
  // --- LOC-1: Amman Main Warehouse ---
  { location_id: 1, product_id: 1, quantity: 120, reserved_quantity: 10, version: 4, updated_at: '2026-11-18T07:30:00+03:00' },
  { location_id: 1, product_id: 2, quantity: 75, reserved_quantity: 5, version: 3, updated_at: '2026-11-18T07:30:00+03:00' },
  { location_id: 1, product_id: 3, quantity: 42, reserved_quantity: 2, version: 2, updated_at: '2026-11-17T16:00:00+03:00' },
  { location_id: 1, product_id: 4, quantity: 85, reserved_quantity: 5, version: 5, updated_at: '2026-11-18T07:45:00+03:00' },
  { location_id: 1, product_id: 5, quantity: 48, reserved_quantity: 4, version: 2, updated_at: '2026-11-17T14:20:00+03:00' },
  { location_id: 1, product_id: 6, quantity: 36, reserved_quantity: 4, version: 3, updated_at: '2026-11-18T08:00:00+03:00' },
  { location_id: 1, product_id: 7, quantity: 30, reserved_quantity: 0, version: 1, updated_at: '2026-11-16T11:00:00+03:00' },
  { location_id: 1, product_id: 8, quantity: 45, reserved_quantity: 5, version: 6, updated_at: '2026-11-18T08:05:00+03:00' },
  { location_id: 1, product_id: 9, quantity: 4, reserved_quantity: 1, version: 3, updated_at: '2026-11-18T07:50:00+03:00' },
  { location_id: 1, product_id: 10, quantity: 38, reserved_quantity: 2, version: 2, updated_at: '2026-11-17T12:00:00+03:00' },
  { location_id: 1, product_id: 11, quantity: 50, reserved_quantity: 0, version: 2, updated_at: '2026-11-17T12:00:00+03:00' },
  { location_id: 1, product_id: 12, quantity: 2, reserved_quantity: 0, version: 4, updated_at: '2026-11-18T07:20:00+03:00' },
  { location_id: 1, product_id: 13, quantity: 65, reserved_quantity: 5, version: 2, updated_at: '2026-11-17T15:00:00+03:00' },
  { location_id: 1, product_id: 14, quantity: 14, reserved_quantity: 2, version: 1, updated_at: '2026-11-16T09:00:00+03:00' },
  { location_id: 1, product_id: 15, quantity: 180, reserved_quantity: 20, version: 3, updated_at: '2026-11-18T07:10:00+03:00' },
  { location_id: 1, product_id: 16, quantity: 44, reserved_quantity: 4, version: 2, updated_at: '2026-11-17T17:00:00+03:00' },

  // --- LOC-2: Abdali Retail Branch ---
  { location_id: 2, product_id: 1, quantity: 18, reserved_quantity: 4, version: 2, updated_at: '2026-11-18T08:00:00+03:00' }, // Avail 14 (Low: <25)
  { location_id: 2, product_id: 2, quantity: 6, reserved_quantity: 0, version: 2, updated_at: '2026-11-18T07:55:00+03:00' },  // Avail 6  (Low: <15)
  { location_id: 2, product_id: 3, quantity: 14, reserved_quantity: 0, version: 1, updated_at: '2026-11-16T10:00:00+03:00' }, // Avail 14 (Healthy)
  { location_id: 2, product_id: 4, quantity: 5, reserved_quantity: 0, version: 2, updated_at: '2026-11-18T08:10:00+03:00' },  // Avail 5  (Low: <20)
  { location_id: 2, product_id: 5, quantity: 16, reserved_quantity: 2, version: 1, updated_at: '2026-11-17T11:00:00+03:00' }, // Avail 14 (Healthy)
  { location_id: 2, product_id: 6, quantity: 9, reserved_quantity: 1, version: 2, updated_at: '2026-11-17T13:30:00+03:00' },  // Avail 8  (Healthy)
  { location_id: 2, product_id: 7, quantity: 12, reserved_quantity: 0, version: 1, updated_at: '2026-11-16T14:00:00+03:00' }, // Avail 12 (Healthy)
  { location_id: 2, product_id: 8, quantity: 14, reserved_quantity: 2, version: 3, updated_at: '2026-11-18T08:12:00+03:00' }, // Avail 12 (Contention target!)
  { location_id: 2, product_id: 9, quantity: 8, reserved_quantity: 1, version: 2, updated_at: '2026-11-17T16:15:00+03:00' },  // Avail 7  (Healthy)
  { location_id: 2, product_id: 10, quantity: 16, reserved_quantity: 0, version: 1, updated_at: '2026-11-17T09:00:00+03:00' },// Avail 16 (Healthy)
  { location_id: 2, product_id: 11, quantity: 20, reserved_quantity: 2, version: 1, updated_at: '2026-11-17T09:00:00+03:00' },// Avail 18 (Healthy)
  { location_id: 2, product_id: 12, quantity: 0, reserved_quantity: 0, version: 4, updated_at: '2026-11-18T07:45:00+03:00' }, // Avail 0  (OUT_OF_STOCK)
  { location_id: 2, product_id: 13, quantity: 22, reserved_quantity: 0, version: 1, updated_at: '2026-11-16T12:00:00+03:00' },// Avail 22 (Healthy)
  { location_id: 2, product_id: 14, quantity: 6, reserved_quantity: 0, version: 1, updated_at: '2026-11-15T15:00:00+03:00' }, // Avail 6  (Healthy)
  { location_id: 2, product_id: 15, quantity: 42, reserved_quantity: 5, version: 2, updated_at: '2026-11-17T14:00:00+03:00' },// Avail 37 (Healthy)
  { location_id: 2, product_id: 16, quantity: 14, reserved_quantity: 0, version: 1, updated_at: '2026-11-16T16:00:00+03:00' },// Avail 14 (Healthy)

  // --- LOC-3: Irbid Distribution Hub ---
  { location_id: 3, product_id: 1, quantity: 35, reserved_quantity: 0, version: 2, updated_at: '2026-11-17T14:00:00+03:00' },
  { location_id: 3, product_id: 2, quantity: 22, reserved_quantity: 2, version: 1, updated_at: '2026-11-17T14:00:00+03:00' },
  { location_id: 3, product_id: 3, quantity: 11, reserved_quantity: 0, version: 1, updated_at: '2026-11-16T10:00:00+03:00' },
  { location_id: 3, product_id: 4, quantity: 28, reserved_quantity: 4, version: 2, updated_at: '2026-11-17T15:30:00+03:00' },
  { location_id: 3, product_id: 5, quantity: 15, reserved_quantity: 0, version: 1, updated_at: '2026-11-16T11:00:00+03:00' },
  { location_id: 3, product_id: 6, quantity: 0, reserved_quantity: 0, version: 3, updated_at: '2026-11-18T08:00:00+03:00' }, // OUT_OF_STOCK
  { location_id: 3, product_id: 7, quantity: 14, reserved_quantity: 0, version: 1, updated_at: '2026-11-16T11:00:00+03:00' },
  { location_id: 3, product_id: 8, quantity: 10, reserved_quantity: 0, version: 2, updated_at: '2026-11-17T12:00:00+03:00' },
  { location_id: 3, product_id: 9, quantity: 7, reserved_quantity: 0, version: 1, updated_at: '2026-11-16T09:00:00+03:00' },
  { location_id: 3, product_id: 10, quantity: 12, reserved_quantity: 0, version: 1, updated_at: '2026-11-16T09:00:00+03:00' },
  { location_id: 3, product_id: 11, quantity: 12, reserved_quantity: 2, version: 2, updated_at: '2026-11-17T16:00:00+03:00' },
  { location_id: 3, product_id: 12, quantity: 7, reserved_quantity: 1, version: 1, updated_at: '2026-11-17T10:00:00+03:00' },
  { location_id: 3, product_id: 13, quantity: 26, reserved_quantity: 0, version: 2, updated_at: '2026-11-17T15:20:00+03:00' },
  { location_id: 3, product_id: 14, quantity: 5, reserved_quantity: 0, version: 1, updated_at: '2026-11-15T12:00:00+03:00' },
  { location_id: 3, product_id: 15, quantity: 14, reserved_quantity: 2, version: 2, updated_at: '2026-11-18T07:40:00+03:00' }, // Avail 12 (Low: <30)
  { location_id: 3, product_id: 16, quantity: 15, reserved_quantity: 0, version: 1, updated_at: '2026-11-16T13:00:00+03:00' },
];

// ----------------------------------------------------------------------------
// 5. Orders & Order Items (10 Realistic Orders with Contention & Shortages)
// ----------------------------------------------------------------------------

const SEED_ORDERS: Order[] = [
  {
    id: 1,
    order_number: 'ORD-2026-1041',
    customer_name: 'Jordan Gulf Retail Group',
    fulfillment_location_id: 2,
    status: 'PENDING',
    priority: 'HIGH',
    requested_delivery_date: '2026-11-18',
    notes: 'Priority store rollout batch #1 — needs morning dispatch.',
    version: 1,
    created_at: '2026-11-18T08:15:00+03:00',
  },
  {
    id: 2,
    order_number: 'ORD-2026-1042',
    customer_name: 'Al-Manara Hypermarket',
    fulfillment_location_id: 2,
    status: 'PENDING',
    priority: 'HIGH',
    requested_delivery_date: '2026-11-18',
    notes: 'Checkout lane scanner expansion; shares scanner pool with ORD-2026-1041.',
    version: 1,
    created_at: '2026-11-18T08:40:00+03:00',
  },
  {
    id: 3,
    order_number: 'ORD-2026-1043',
    customer_name: 'Zara Pharmacy Network',
    fulfillment_location_id: 2,
    status: 'PENDING',
    priority: 'NORMAL',
    requested_delivery_date: '2026-11-19',
    notes: 'POS consumables & network drops for Abdali clinic counter.',
    version: 1,
    created_at: '2026-11-18T09:05:00+03:00',
  },
  {
    id: 4,
    order_number: 'ORD-2026-1044',
    customer_name: 'Hashemite Systems Integrators',
    fulfillment_location_id: 2,
    status: 'PENDING',
    priority: 'HIGH',
    requested_delivery_date: '2026-11-18',
    notes: 'Urgent workstation NVMe upgrade.',
    version: 1,
    created_at: '2026-11-18T09:20:00+03:00',
  },
  {
    id: 5,
    order_number: 'ORD-2026-1045',
    customer_name: 'MedCare Diagnostics Amman',
    fulfillment_location_id: 2,
    status: 'PENDING',
    priority: 'NORMAL',
    requested_delivery_date: '2026-11-19',
    notes: 'Sample labeling thermal rolls and reception keyboards.',
    version: 1,
    created_at: '2026-11-18T09:45:00+03:00',
  },
  {
    id: 6,
    order_number: 'ORD-2026-1046',
    customer_name: 'Aqaba Port Logistics IT',
    fulfillment_location_id: 1,
    status: 'PENDING',
    priority: 'HIGH',
    requested_delivery_date: '2026-11-18',
    notes: 'Direct warehouse pallet fulfillment.',
    version: 1,
    created_at: '2026-11-18T08:30:00+03:00',
  },
  {
    id: 7,
    order_number: 'ORD-2026-1047',
    customer_name: 'Royal Jordanian Catering Ops',
    fulfillment_location_id: 1,
    status: 'PENDING',
    priority: 'NORMAL',
    requested_delivery_date: '2026-11-19',
    notes: 'Kitchen dispatch POS printers & sealing packs.',
    version: 1,
    created_at: '2026-11-18T10:10:00+03:00',
  },
  {
    id: 8,
    order_number: 'ORD-2026-1048',
    customer_name: 'Yarmouk Campus Tech Center',
    fulfillment_location_id: 3,
    status: 'PENDING',
    priority: 'HIGH',
    requested_delivery_date: '2026-11-18',
    notes: 'Lab switch replacement; check Amman Main Warehouse for transfer.',
    version: 1,
    created_at: '2026-11-18T08:50:00+03:00',
  },
  {
    id: 9,
    order_number: 'ORD-2026-1049',
    customer_name: 'Northern Express Courier',
    fulfillment_location_id: 3,
    status: 'PENDING',
    priority: 'NORMAL',
    requested_delivery_date: '2026-11-19',
    notes: 'Weekly carton & office peripheral replenishment.',
    version: 1,
    created_at: '2026-11-18T09:30:00+03:00',
  },
  {
    id: 10,
    order_number: 'ORD-2026-1050',
    customer_name: 'Irbid Municipal Archive',
    fulfillment_location_id: 3,
    status: 'FULFILLED',
    priority: 'LOW',
    requested_delivery_date: '2026-11-17',
    notes: 'Completed archival media order.',
    version: 2,
    created_at: '2026-11-17T15:20:00+03:00',
  },
];

const SEED_ORDER_ITEMS: OrderItem[] = [
  // ORD-2026-1041 (LOC-2): 8x PER-SCN-WL (avail 12 -> 4 left), 10x THM-RCP-8080 (avail 14 -> 4 left) => FULL
  { id: 1, order_id: 1, product_id: 8, requested_quantity: 8, allocated_quantity: 8, shortage_quantity: 0 },
  { id: 2, order_id: 1, product_id: 1, requested_quantity: 10, allocated_quantity: 10, shortage_quantity: 0 },

  // ORD-2026-1042 (LOC-2): 9x PER-SCN-WL (cumulatively only 4 left -> short 5!), 4x NET-UTP-5M (avail 5 -> 1 left) => PARTIAL
  { id: 3, order_id: 2, product_id: 8, requested_quantity: 9, allocated_quantity: 4, shortage_quantity: 5 },
  { id: 4, order_id: 2, product_id: 4, requested_quantity: 4, allocated_quantity: 4, shortage_quantity: 0 },

  // ORD-2026-1043 (LOC-2): 10x THM-RCP-8080 (4 left -> short 6), 5x NET-UTP-5M (1 left -> short 4) => PARTIAL
  { id: 5, order_id: 3, product_id: 1, requested_quantity: 10, allocated_quantity: 4, shortage_quantity: 6 },
  { id: 6, order_id: 3, product_id: 4, requested_quantity: 5, allocated_quantity: 1, shortage_quantity: 4 },

  // ORD-2026-1044 (LOC-2): 4x STR-SSD-1T (0 avail -> short 4) => UNAVAILABLE
  { id: 7, order_id: 4, product_id: 12, requested_quantity: 4, allocated_quantity: 0, shortage_quantity: 4 },

  // ORD-2026-1045 (LOC-2): 12x THM-LBL-8050 (avail 6 -> short 6), 4x PER-KB-USB (avail 16 -> full) => PARTIAL
  { id: 8, order_id: 5, product_id: 2, requested_quantity: 12, allocated_quantity: 6, shortage_quantity: 6 },
  { id: 9, order_id: 5, product_id: 10, requested_quantity: 4, allocated_quantity: 4, shortage_quantity: 0 },

  // ORD-2026-1046 (LOC-1): 15x NET-SW8-GB (avail 32 -> full), 20x NET-UTP-5M (avail 80 -> full) => FULL
  { id: 10, order_id: 6, product_id: 6, requested_quantity: 15, allocated_quantity: 15, shortage_quantity: 0 },
  { id: 11, order_id: 6, product_id: 4, requested_quantity: 20, allocated_quantity: 20, shortage_quantity: 0 },

  // ORD-2026-1047 (LOC-1): 6x PER-PRT-POS (avail 3 -> short 3), 10x PKG-TAPE-48 (avail 40 -> full) => PARTIAL
  { id: 12, order_id: 7, product_id: 9, requested_quantity: 6, allocated_quantity: 3, shortage_quantity: 3 },
  { id: 13, order_id: 7, product_id: 16, requested_quantity: 10, allocated_quantity: 10, shortage_quantity: 0 },

  // ORD-2026-1048 (LOC-3): 6x NET-SW8-GB (avail 0 -> short 6) => UNAVAILABLE
  { id: 14, order_id: 8, product_id: 6, requested_quantity: 6, allocated_quantity: 0, shortage_quantity: 6 },

  // ORD-2026-1049 (LOC-3): 20x PKG-BOX-MD (avail 12 -> short 8), 6x PER-MS-WL (avail 10 -> full) => PARTIAL
  { id: 15, order_id: 9, product_id: 15, requested_quantity: 20, allocated_quantity: 12, shortage_quantity: 8 },
  { id: 16, order_id: 9, product_id: 11, requested_quantity: 6, allocated_quantity: 6, shortage_quantity: 0 },

  // ORD-2026-1050 (LOC-3, FULFILLED): 10x STR-USB-64G
  { id: 17, order_id: 10, product_id: 13, requested_quantity: 10, allocated_quantity: 10, shortage_quantity: 0 },
];

// ----------------------------------------------------------------------------
// 6. Stock Transfers (4) & Immutable Stock Movements (12)
// ----------------------------------------------------------------------------

const SEED_STOCK_TRANSFERS: StockTransfer[] = [
  {
    id: 1,
    transfer_number: 'TRF-2026-0041',
    source_location_id: 1,
    destination_location_id: 2,
    status: 'COMPLETED',
    transfer_date: '2026-11-16',
    notes: 'Weekly Abdali showroom networking & ribbon restock.',
    created_by_user_id: 1,
    approved_by_user_id: 2,
    created_at: '2026-11-16T09:00:00+03:00',
    completed_at: '2026-11-16T14:30:00+03:00',
  },
  {
    id: 2,
    transfer_number: 'TRF-2026-0042',
    source_location_id: 1,
    destination_location_id: 3,
    status: 'IN_TRANSIT',
    transfer_date: '2026-11-18',
    notes: 'Scheduled northern route dispatch via Amman-Irbid van.',
    created_by_user_id: 1,
    approved_by_user_id: 2,
    created_at: '2026-11-18T06:45:00+03:00',
    completed_at: null,
  },
  {
    id: 3,
    transfer_number: 'TRF-2026-0043',
    source_location_id: 1,
    destination_location_id: 2,
    status: 'APPROVED',
    transfer_date: '2026-11-18',
    notes: 'Approved morning replenishment for Abdali packaging supplies.',
    created_by_user_id: 2,
    approved_by_user_id: 2,
    created_at: '2026-11-18T07:50:00+03:00',
    completed_at: null,
  },
  {
    id: 4,
    transfer_number: 'TRF-2026-0044',
    source_location_id: 1,
    destination_location_id: 3,
    status: 'DRAFT',
    transfer_date: '2026-11-19',
    notes: 'Proposed transfer to cover Irbid switch & carton deficit.',
    created_by_user_id: 1,
    approved_by_user_id: null,
    created_at: '2026-11-18T09:55:00+03:00',
    completed_at: null,
  },
];

const SEED_STOCK_TRANSFER_ITEMS: StockTransferItem[] = [
  { id: 1, transfer_id: 1, product_id: 5, quantity: 10 },
  { id: 2, transfer_id: 1, product_id: 3, quantity: 8 },
  { id: 3, transfer_id: 2, product_id: 1, quantity: 20 },
  { id: 4, transfer_id: 2, product_id: 13, quantity: 15 },
  { id: 5, transfer_id: 3, product_id: 15, quantity: 25 },
  { id: 6, transfer_id: 4, product_id: 6, quantity: 10 },
  { id: 7, transfer_id: 4, product_id: 15, quantity: 30 },
];

const SEED_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 1, location_id: 1, product_id: 5, movement_type: 'OUT', quantity: 10, reference_type: 'STOCK_TRANSFER', reference_id: 1, created_at: '2026-11-16T10:15:00+03:00' },
  { id: 2, location_id: 2, product_id: 5, movement_type: 'IN', quantity: 10, reference_type: 'STOCK_TRANSFER', reference_id: 1, created_at: '2026-11-16T14:30:00+03:00' },
  { id: 3, location_id: 1, product_id: 3, movement_type: 'OUT', quantity: 8, reference_type: 'STOCK_TRANSFER', reference_id: 1, created_at: '2026-11-16T10:15:00+03:00' },
  { id: 4, location_id: 2, product_id: 3, movement_type: 'IN', quantity: 8, reference_type: 'STOCK_TRANSFER', reference_id: 1, created_at: '2026-11-16T14:30:00+03:00' },
  { id: 5, location_id: 1, product_id: 1, movement_type: 'IN', quantity: 80, reference_type: 'REORDER_RECEIPT', reference_id: 84, created_at: '2026-11-16T16:40:00+03:00' },
  { id: 6, location_id: 1, product_id: 8, movement_type: 'IN', quantity: 25, reference_type: 'REORDER_RECEIPT', reference_id: 85, created_at: '2026-11-17T10:00:00+03:00' },
  { id: 7, location_id: 3, product_id: 13, movement_type: 'OUT', quantity: 10, reference_type: 'ORDER_FULFILLMENT', reference_id: 10, created_at: '2026-11-17T15:40:00+03:00' },
  { id: 8, location_id: 2, product_id: 12, movement_type: 'OUT', quantity: 3, reference_type: 'ORDER_FULFILLMENT', reference_id: 1038, created_at: '2026-11-17T17:10:00+03:00' },
  { id: 9, location_id: 2, product_id: 2, movement_type: 'ADJUSTMENT', quantity: -2, reference_type: 'MANUAL_ADJUSTMENT', reference_id: 1, created_at: '2026-11-17T18:00:00+03:00' },
  { id: 10, location_id: 1, product_id: 1, movement_type: 'OUT', quantity: 20, reference_type: 'STOCK_TRANSFER', reference_id: 2, created_at: '2026-11-18T07:05:00+03:00' },
  { id: 11, location_id: 1, product_id: 13, movement_type: 'OUT', quantity: 15, reference_type: 'STOCK_TRANSFER', reference_id: 2, created_at: '2026-11-18T07:05:00+03:00' },
  { id: 12, location_id: 3, product_id: 6, movement_type: 'OUT', quantity: 4, reference_type: 'ORDER_FULFILLMENT', reference_id: 1039, created_at: '2026-11-18T07:55:00+03:00' },
];

// ----------------------------------------------------------------------------
// 7. Pre-Seeded Bounded Agent Run & Pending Approval Draft (HITL Ready)
// ----------------------------------------------------------------------------

const SEED_AGENT_RUNS: AgentRun[] = [
  {
    id: 1,
    run_code: 'RUN-2026-0312',
    user_id: 1,
    user_prompt:
      'Review morning thermal label and barcode scanner thresholds at Abdali Retail Branch and prepare a verified reorder draft.',
    status: 'AWAITING_APPROVAL',
    step_count: 5,
    max_steps: 5,
    generated_draft_id: 1,
    clarification_question: null,
    final_summary:
      'Evaluated Abdali Retail Branch stock against morning priority orders. Prepared verified supplier reorder draft DRF-2026-089 for PER-SCN-WL (13 pcs) and THM-LBL-8050 (40 rolls). Awaiting Manager approval.',
    total_latency_ms: 842,
    created_at: '2026-11-18T09:50:00+03:00',
  },
];

const SEED_AGENT_STEPS: AgentStep[] = [
  {
    id: 1,
    run_id: 1,
    step_number: 1,
    stage_label: 'INTERPRET_REQUEST',
    tool_name: 'list_pending_orders',
    tool_input_json: JSON.stringify({ locationId: 2, priority: 'ALL' }),
    tool_output_summary: 'Retrieved 5 pending orders at Abdali Retail Branch (LOC-2).',
    verification_status: 'VERIFIED',
    latency_ms: 118,
    timestamp: '2026-11-18T09:50:01+03:00',
  },
  {
    id: 2,
    run_id: 1,
    step_number: 2,
    stage_label: 'RETRIEVE_DATA',
    tool_name: 'get_inventory_status',
    tool_input_json: JSON.stringify({ locationId: 2, productIds: [8, 2] }),
    tool_output_summary:
      'PER-SCN-WL: 12 avail (v3); THM-LBL-8050: 6 avail (v2). Both near or below reorder threshold.',
    verification_status: 'VERIFIED',
    latency_ms: 145,
    timestamp: '2026-11-18T09:50:02+03:00',
  },
  {
    id: 3,
    run_id: 1,
    step_number: 3,
    stage_label: 'ASSESS_FEASIBILITY',
    tool_name: 'check_order_feasibility',
    tool_input_json: JSON.stringify({ locationId: 2, mode: 'CUMULATIVE' }),
    tool_output_summary:
      'Cumulative check identified 5-unit shortage on PER-SCN-WL (ORD-2026-1042) and 6-roll shortage on THM-LBL-8050 (ORD-2026-1045).',
    verification_status: 'WARNING',
    latency_ms: 214,
    timestamp: '2026-11-18T09:50:03+03:00',
  },
  {
    id: 4,
    run_id: 1,
    step_number: 4,
    stage_label: 'PREPARE_DRAFT',
    tool_name: 'prepare_reorder_draft',
    tool_input_json: JSON.stringify({
      draftType: 'REORDER_DRAFT',
      targetLocationId: 2,
      items: [
        { productId: 8, locationId: 2, suggestedReorderQty: 20 },
        { productId: 2, locationId: 2, suggestedReorderQty: 40 },
      ],
    }),
    tool_output_summary: 'Created staging draft DRF-2026-089 with version snapshots (v3, v2).',
    verification_status: 'VERIFIED',
    latency_ms: 196,
    timestamp: '2026-11-18T09:50:04+03:00',
  },
  {
    id: 5,
    run_id: 1,
    step_number: 5,
    stage_label: 'VERIFY_AND_REPORT',
    tool_name: 'verify_draft',
    tool_input_json: JSON.stringify({ draftId: 1 }),
    tool_output_summary:
      'Deterministic check passed: optimistic lock versions match (v3, v2); quantities positive. Transitioned to VERIFIED_PENDING_APPROVAL.',
    verification_status: 'VERIFIED',
    latency_ms: 169,
    timestamp: '2026-11-18T09:50:05+03:00',
  },
];

const SEED_REORDER_DRAFTS: ReorderDraft[] = [
  {
    id: 1,
    draft_code: 'DRF-2026-089',
    draft_type: 'REORDER_DRAFT',
    title: 'Abdali Branch Scanner & Barcode Label Replenishment',
    target_location_id: 2,
    source_location_id: null,
    related_order_ids: [1, 2, 5],
    status: 'VERIFIED_PENDING_APPROVAL',
    created_by_agent_run_id: 1,
    created_by_user_id: 1,
    reviewed_by_user_id: null,
    verification_passed: true,
    verification_warnings: [
      'Amman Main Warehouse holds 30 surplus units of PER-SCN-WL; inter-warehouse transfer is also viable.',
    ],
    rationale:
      'Cumulative FIFO evaluation of ORD-2026-1041, ORD-2026-1042, and ORD-2026-1045 depletes Abdali stock for PER-SCN-WL (-5 pcs) and THM-LBL-8050 (-6 rolls).',
    created_at: '2026-11-18T09:50:05+03:00',
    reviewed_at: null,
  },
];

const SEED_REORDER_DRAFT_ITEMS: ReorderDraftItem[] = [
  {
    id: 1,
    draft_id: 1,
    product_id: 8,
    location_id: 2,
    current_available_qty: 12,
    expected_inventory_version: 3,
    shortage_qty: 5,
    suggested_reorder_qty: 20,
    supplier_name: 'Petra Tech Distribution',
  },
  {
    id: 2,
    draft_id: 1,
    product_id: 2,
    location_id: 2,
    current_available_qty: 6,
    expected_inventory_version: 2,
    shortage_qty: 6,
    suggested_reorder_qty: 40,
    supplier_name: 'Al-Noor Paper Industries',
  },
];

// ----------------------------------------------------------------------------
// 8. Initial Audit Logs (6 Entries)
// ----------------------------------------------------------------------------

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 1,
    timestamp: '2026-11-18T06:45:00+03:00',
    actor_user_id: 2,
    actor_role: 'MANAGER',
    action_category: 'STOCK_TRANSFER',
    action_name: 'approve_stock_transfer',
    entity_type: 'stock_transfers',
    entity_id: 'TRF-2026-0042',
    details: 'Approved inter-location dispatch from Amman Main Warehouse to Irbid Distribution Hub (35 units).',
  },
  {
    id: 2,
    timestamp: '2026-11-18T07:50:00+03:00',
    actor_user_id: 2,
    actor_role: 'MANAGER',
    action_category: 'STOCK_TRANSFER',
    action_name: 'approve_stock_transfer',
    entity_type: 'stock_transfers',
    entity_id: 'TRF-2026-0043',
    details: 'Approved packaging carton transfer (25 pcs PKG-BOX-MD) to Abdali Retail Branch.',
  },
  {
    id: 3,
    timestamp: '2026-11-18T09:50:01+03:00',
    actor_user_id: 1,
    actor_role: 'EMPLOYEE',
    action_category: 'AGENT_TOOL_CALL',
    action_name: 'list_pending_orders',
    entity_type: 'agent_runs',
    entity_id: 'RUN-2026-0312',
    details: 'Read-only order retrieval for Abdali Retail Branch (5 pending orders).',
  },
  {
    id: 4,
    timestamp: '2026-11-18T09:50:03+03:00',
    actor_user_id: 1,
    actor_role: 'EMPLOYEE',
    action_category: 'AGENT_TOOL_CALL',
    action_name: 'check_order_feasibility',
    entity_type: 'agent_runs',
    entity_id: 'RUN-2026-0312',
    details: 'Cumulative FIFO feasibility detected multi-order contention on PER-SCN-WL (-5 pcs) and THM-LBL-8050 (-6 rolls).',
  },
  {
    id: 5,
    timestamp: '2026-11-18T09:50:04+03:00',
    actor_user_id: 1,
    actor_role: 'EMPLOYEE',
    action_category: 'DRAFT_CREATED',
    action_name: 'prepare_reorder_draft',
    entity_type: 'reorder_drafts',
    entity_id: 'DRF-2026-089',
    details: 'Staged supplier reorder draft DRF-2026-089 with optimistic lock snapshots (v3, v2).',
  },
  {
    id: 6,
    timestamp: '2026-11-18T09:50:05+03:00',
    actor_user_id: 1,
    actor_role: 'EMPLOYEE',
    action_category: 'AGENT_TOOL_CALL',
    action_name: 'verify_draft',
    entity_type: 'reorder_drafts',
    entity_id: 'DRF-2026-089',
    details: 'Deterministic validation passed; draft queued as VERIFIED_PENDING_APPROVAL.',
  },
];

// ----------------------------------------------------------------------------
// 9. Fresh Seed Factory (Deep Clone for Deterministic Reset / Purity)
// ----------------------------------------------------------------------------

export function createInitialOperationsState(): OperationsState {
  return structuredClone({
    branches: SEED_BRANCHES,
    warehouses: SEED_WAREHOUSES,
    locations: SEED_LOCATIONS,
    categories: SEED_CATEGORIES,
    products: SEED_PRODUCTS,
    inventoryBalances: SEED_INVENTORY_BALANCES,
    stockTransfers: SEED_STOCK_TRANSFERS,
    stockTransferItems: SEED_STOCK_TRANSFER_ITEMS,
    stockMovements: SEED_STOCK_MOVEMENTS,
    users: SEED_USERS,
    orders: SEED_ORDERS,
    orderItems: SEED_ORDER_ITEMS,
    reorderDrafts: SEED_REORDER_DRAFTS,
    reorderDraftItems: SEED_REORDER_DRAFT_ITEMS,
    agentRuns: SEED_AGENT_RUNS,
    agentSteps: SEED_AGENT_STEPS,
    auditLogs: SEED_AUDIT_LOGS,
  });
}
