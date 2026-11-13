// EV R0 mechanical concept. Units mm. No waterproof or skin-contact certification.
// shortcut: optical stack, supplier parts and print fits are provisional; revise after physical part measurements.
include <generated/dimensions.scad>
part = "assembly"; // body, back, assembly, exploded, main_outline, sensor_outline
$fn = 48;
eps = 0.02;

module rr(w,h,r) { hull() for(x=[-1,1],y=[-1,1]) translate([x*(w/2-r),y*(h/2-r)]) circle(r=r); }
module slab(w,h,r,z,t) { translate([0,0,z]) linear_extrude(t) rr(w,h,r); }
module screw_boss(x,y) {
  difference() {
    hull() {
      translate([x,y,case_back]) cylinder(h=main_z-case_back,r=2);
      translate([sign(x)*19.4,sign(y)*17.2,case_back]) cylinder(h=main_z-case_back,r=1.6);
    }
    translate([x,y,case_back-eps]) cylinder(h=main_z-case_back+2*eps,d=1.3);
  }
}
module lugs() {
  for(y=[-1,1],x=[-1,1]) difference() {
    translate([x*12.9,y*24,7.8]) cube([3.4,6,4.6],center=true);
    translate([x*12.9,y*25,7.8]) rotate([0,90,0]) cylinder(h=5,d=1.6,center=true);
  }
}
module body() {
  difference() {
    union() {
      difference() {
        slab(case_w,case_h,case_r,case_back,case_body_top-case_back);
        slab(case_w-2*case_wall,case_h-2*case_wall,case_r-case_wall,case_back-eps,15.6-case_back+eps);
        slab(display_opening,display_opening,2,15.6-eps,3);
      }
      for(p=main_holes) screw_boss(p[0],p[1]);
      lugs();
      // Polymer upper bridge reserves a future external antenna. It is not an RF-validated antenna fixture.
      translate([0,23.5,12]) linear_extrude(4.2) rr(24,6,2);
    }
    // Main pushbutton aperture, speaker slots and microphone side port.
    translate([23,5,11.4]) rotate([0,90,0]) cylinder(h=6,d=3,center=true);
    for(z=[11.2,12,12.8]) translate([23,8,z]) cube([6,8,0.55],center=true);
    translate([-23,-8,9.3]) rotate([0,90,0]) cylinder(h=6,d=1.2,center=true);
    translate([0,23.5,13.3]) linear_extrude(0.9) rr(22.4,5.2,1);
    // Coax routing entry into the main cavity.
    translate([0,20.8,13.7]) cube([3,4,1.4],center=true);
  }
}
module back() {
  difference() {
    union() {
      slab(case_w,case_h,case_r,0,case_back);
      difference() {
        slab(42.2,40.2,6.1,case_back,0.8);
        slab(40.6,38.6,5.3,case_back-eps,0.8+2*eps);
      }
      slab(11,8,2,-0.8,case_back+0.8);
      for(p=sensor_holes) translate([p[0],p[1],case_back]) cylinder(h=sensor_z-case_back,r=1.6);
    }
    // Optical and skin-temperature windows. Actual glazing and isolation are separate components.
    slab(9,6,1,-1,5);
    translate([-6.5,4.5,0]) slab(3.5,3.5,0.5,-1,5);
    for(p=main_holes) {
      translate([p[0],p[1],-eps]) cylinder(h=case_back+1,d=1.8);
      translate([p[0],p[1],-eps]) cylinder(h=0.9,d=3.1);
    }
    for(p=sensor_holes) translate([p[0],p[1],case_back-eps]) cylinder(h=2,d=1);
    for(x=[-3,3]) translate([x,-15,-eps]) cylinder(h=case_back+2*eps,d=2.1);
  }
}
module pcb(w,h,r,z,t,holes,d) {
  difference() {
    slab(w,h,r,z,t);
    for(p=holes) translate([p[0],p[1],z-eps]) cylinder(h=t+2*eps,d=d);
  }
}
module electronics(ex=0) {
  color([0.07,0.27,0.23]) pcb(sensor_w,sensor_h,2,sensor_z+ex,sensor_t,sensor_holes,1.4);
  color([0.12,0.13,0.15]) translate([0,0,sensor_z+ex-1.55/2]) cube([5.6,3.3,1.55],center=true);
  color([0.7,0.7,0.72]) translate([-6.5,4.5,sensor_z+ex-0.75/2]) cube([2,2,0.75],center=true);
  color([0.55,0.58,0.61]) translate([0,-2,battery_z+2+2*ex]) cube([battery_w,battery_h,4],center=true);
  color([0.08,0.32,0.27]) pcb(main_w,main_h,4,main_z+3*ex,main_t,main_holes,2);
  for(c=component_boxes) color([0.22,0.25,0.28]) translate([c[0],c[1],main_z+main_t+c[4]/2+3*ex]) cube([c[2],c[3],c[4]],center=true);
  color([0.1,0.12,0.14]) translate([-18.5,-4,6.9+2*ex]) cube([4,8,3],center=true);
  color([0.12,0.15,0.19]) slab(display_w,display_h,1,display_z+4*ex,1.9);
  color([0.015,0.045,0.055]) slab(27.72,27.72,1,display_z+1.91+4*ex,0.03);
  color([0.2,0.8,0.8]) translate([0,0,display_z+1.95+4*ex]) linear_extrude(0.02) difference() { circle(r=7); circle(r=6.3); }
}
module assembly(ex=0) {
  color([0.18,0.2,0.23]) back();
  electronics(ex);
  color([0.12,0.14,0.17],ex>0?1:0.32) translate([0,0,13*ex]) body();
  color([0.04,0.07,0.09],0.22) slab(42,40,6,16.2+16*ex,0.8);
  color([0.2,0.65,0.68]) translate([23.8,5,11.4+13*ex]) rotate([0,90,0]) cylinder(h=1.8,d=3,center=true);
}

if(part=="body") body();
else if(part=="back") back();
else if(part=="exploded") assembly(2);
else if(part=="main_outline") difference() { rr(main_w,main_h,4); for(p=main_holes) translate(p) circle(d=2); }
else if(part=="sensor_outline") difference() { rr(sensor_w,sensor_h,2); for(p=sensor_holes) translate(p) circle(d=1.4); }
else assembly();
