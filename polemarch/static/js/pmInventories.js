/**
 * Changes options of InventoryImport Model's fields.
 */
tabSignal.connect("models[InventoryImport].fields.beforeInit", fields => {
    fields.inventory_id.hidden = true;
    fields.raw_data.format = 'file';
    fields.raw_data.title = 'Inventory file';
});