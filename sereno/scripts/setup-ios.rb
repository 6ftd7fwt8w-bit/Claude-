# Añade al proyecto de Xcode (ios/App/App.xcodeproj) lo propio de Sereno:
#   - el plugin SerenoBridge y el controlador que lo registra (target App)
#   - el código compartido con el widget (Shared/)
#   - el target del widget (SerenoWidget) embebido en la app
#   - App Groups (entitlements) en ambos
# Es idempotente: se puede ejecutar varias veces.  Uso: ruby scripts/setup-ios.rb
require 'xcodeproj'

ROOT = File.expand_path('../ios/App', __dir__)
project = Xcodeproj::Project.open(File.join(ROOT, 'App.xcodeproj'))
app = project.targets.find { |t| t.name == 'App' } or abort 'No encuentro el target App'
app_group = project.main_group['App'] or abort 'No encuentro el grupo App'

def add_file(group, path, targets)
  ref = group.files.find { |f| f.path == File.basename(path) } || group.new_reference(File.basename(path))
  targets.each do |t|
    next if t.source_build_phase.files_references.include?(ref)
    t.source_build_phase.add_file_reference(ref)
  end
  ref
end

# --- App: plugin + controlador + entitlements
add_file(app_group, 'SerenoBridge.swift', [app])
add_file(app_group, 'SerenoViewController.swift', [app])
app_group.files.find { |f| f.path == 'App.entitlements' } || app_group.new_reference('App.entitlements')
app.build_configurations.each do |c|
  c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
end

# --- Widget
widget = project.targets.find { |t| t.name == 'SerenoWidget' }
unless widget
  widget = project.new_target(:app_extension, 'SerenoWidget', :ios, '17.0', nil, :swift)
  widget.product_reference.name = 'SerenoWidget.appex'
end
widget_group = project.main_group['SerenoWidget'] || project.main_group.new_group('SerenoWidget', 'SerenoWidget')
add_file(widget_group, 'SerenoWidget.swift', [widget])
%w[Info.plist SerenoWidget.entitlements].each do |f|
  widget_group.files.find { |r| r.path == f } || widget_group.new_reference(f)
end

shared_group = project.main_group['Shared'] || project.main_group.new_group('Shared', 'Shared')
add_file(shared_group, 'SharedStore.swift', [app, widget])

app_settings = app.build_configurations.first.build_settings
widget.build_configurations.each do |c|
  s = c.build_settings
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['PRODUCT_BUNDLE_IDENTIFIER'] = "#{app_settings['PRODUCT_BUNDLE_IDENTIFIER']}.SerenoWidget"
  s['INFOPLIST_FILE'] = 'SerenoWidget/Info.plist'
  s['GENERATE_INFOPLIST_FILE'] = 'YES'
  s['INFOPLIST_KEY_CFBundleDisplayName'] = 'Sereno'
  s['INFOPLIST_KEY_NSHumanReadableCopyright'] = ''
  s['CODE_SIGN_ENTITLEMENTS'] = 'SerenoWidget/SerenoWidget.entitlements'
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
  s['SWIFT_VERSION'] = '5.0'
  s['TARGETED_DEVICE_FAMILY'] = '1,2'
  s['SKIP_INSTALL'] = 'YES'
  s['SWIFT_EMIT_LOC_STRINGS'] = 'YES'
  s['MARKETING_VERSION'] = app_settings['MARKETING_VERSION'] || '1.0'
  s['CURRENT_PROJECT_VERSION'] = app_settings['CURRENT_PROJECT_VERSION'] || '1'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
end
%w[WidgetKit SwiftUI].each do |fw|
  next if widget.frameworks_build_phase.files_references.any? { |r| r.path&.include?("#{fw}.framework") }
  widget.add_system_framework(fw)
end

# --- Embeber el widget en la app
app.add_dependency(widget) unless app.dependencies.any? { |d| d.target == widget }
embed = app.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' }
unless embed
  embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
  embed.symbol_dst_subfolder_spec = :plug_ins
end
unless embed.files_references.include?(widget.product_reference)
  bf = embed.add_file_reference(widget.product_reference)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end

project.save
puts "Proyecto actualizado: targets = #{project.targets.map(&:name).join(', ')}"
