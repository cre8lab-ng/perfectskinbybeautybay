import { useState } from "react";
import { MdOutlineKeyboardArrowDown, MdMenu, MdClose } from "react-icons/md";
import { PiPhoneLight } from "react-icons/pi";
import { VscMail } from "react-icons/vsc";
import { FiSearch, FiHeart } from "react-icons/fi";
import { RiUserLine } from "react-icons/ri";
import { IoBagHandleOutline } from "react-icons/io5";
import Image from "next/image";
import Link from "next/link";
import router from "next/router";

const navItems = [
  { name: "Skincare", url: "https://beautybayafrica.com/product-category/skin-care/" },
  { name: "Makeup", url: "https://beautybayafrica.com/product-category/make-up/" },
  {
    name: "Fragrance",
    url: "https://beautybayafrica.com/product-category/fragrance/",
  },
  {
    name: "Haircare & Nails",
    url: "https://beautybayafrica.com/product-category/hair-care-nails/",
  },
  {
    name: "Wellness & Supplements",
    url: "https://beautybayafrica.com/product-category/wellness-supplements/",
  },
  {
    name: "Lighting & Content Tools",
    url: "https://beautybayafrica.com/product-category/lighting-content-tools/",
  },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="w-full relative z-50">
      {/* Notification - only on desktop */}
      <div className="bg-darkpink text-white text-sm py-2 px-4 lg:px-6 font-bold hidden lg:flex justify-between items-center">
        <span>Enjoy a free gift with every order.</span>
        <span>Delivery: Lagos 1-3 days | Outside 2-5 days</span>
        <div className="flex gap-4 items-center">
          <a href="tel:0816259862" className="flex items-center gap-2">
            <PiPhoneLight size={20} />
            0816 259 8682
          </a>
          <span>|</span>
          <a
            href="mailto:support@beautybayafrica.com"
            className="flex items-center gap-2"
          >
            <VscMail size={20} />
            support@beautybayafrica.com
          </a>
        </div>
      </div>

      {/* Header section */}
      <div className="bg-white lg:bg-lightpink flex justify-between items-center py-2 px-4 lg:px-6">
        {/* Logo */}
        <Image
          src="/images/bb-logo.png"
          alt="BH Logo"
          width={100}
          height={100}
          onClick={() => router.push("/")}
          style={{ cursor: "pointer" }}
          priority
        />


        {/* Desktop Nav */}

        <div className="hidden lg:flex gap-6 text-pink-600 font-medium text-lg">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.url}
              className="flex items-center cursor-pointer hover:underline"
            >
              <span className="text-base">{item.name}</span>
              <MdOutlineKeyboardArrowDown />
            </Link>
          ))}
        </div>

        {/* Desktop Icons */}
        <div className="hidden lg:flex items-center gap-4 text-darkpink text-xl relative">
          <FiSearch className="cursor-pointer" />
          <RiUserLine className="cursor-pointer" />
          <div className="relative">
            <FiHeart className="cursor-pointer" />
            <span className="absolute -top-2 -right-2 bg-darkpink text-white text-xs w-5 h-5 flex justify-center items-center rounded-full">
              0
            </span>
          </div>
          <div className="relative">
            <IoBagHandleOutline className="cursor-pointer" />
            <span className="absolute -top-2 -right-2 bg-darkpink text-white text-xs w-5 h-5 flex justify-center items-center rounded-full">
              1
            </span>
          </div>
        </div>

        {/* Hamburger - only on tablet & mobile */}
        <div className="lg:hidden flex items-center">
          <button onClick={() => setIsMenuOpen(true)}>
            <MdMenu size={28} className="text-darkpink" />
          </button>
        </div>
      </div>

      {/* Slide-in Mobile Menu + Overlay */}
      {isMenuOpen && (
        <>
          {/* Faint Overlay */}
          <div
            className="fixed inset-0 bg-black/10 z-40"
            onClick={() => setIsMenuOpen(false)}
          ></div>

          {/* Drawer Menu */}
          <div className="fixed top-0 left-0 h-full w-4/5 bg-white z-50 shadow-lg flex flex-col p-6 animate-slide-in">
            {/* Close */}
            <div className="flex justify-end mb-6">
              <button onClick={() => setIsMenuOpen(false)}>
                <MdClose size={24} />
              </button>
            </div>

            {/* Nav Items */}
            <div className="flex flex-col gap-4 text-pink-600 font-medium text-base">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.url}
                  className="flex justify-between items-center pb-2 cursor-pointer"
                >
                  {item.name.toUpperCase()}
                  <MdOutlineKeyboardArrowDown />
                </Link>
              ))}
            </div>

            {/* Login Button */}
            {/* <button className="mt-8 border border-darkpink w-full py-2 rounded text-darkpink font-medium flex items-center justify-center gap-2">
              <IoBagHandleOutline />
              Login or Register
            </button> */}
          </div>
        </>
      )}
    </div>
  );
}
