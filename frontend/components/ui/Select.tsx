import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CaretUpDown, Check } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    value: SelectOption;
    onChange: (value: SelectOption) => void;
    options: SelectOption[];
    className?: string;
}

const Select: React.FC<SelectProps> = ({ value, onChange, options, className }) => {
    return (
        <div className={cn("relative", className)}>
            <Listbox value={value} onChange={onChange}>
                {({ open }) => (
                    <>
                        <Listbox.Button className={cn(
                            "relative w-full cursor-pointer rounded-xl py-2.5 pl-4 pr-10 text-left text-sm transition-all duration-200",
                            "bg-surface/80 backdrop-blur-sm border border-white/10 text-textMain",
                            "hover:bg-surfaceHover hover:border-white/20",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50",
                            open && "border-primary/50 ring-2 ring-primary/20 bg-surfaceHover"
                        )}>
                            <span className="block truncate font-medium">{value.label}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <CaretUpDown size={16} weight="bold" className="text-textMuted" />
                            </span>
                        </Listbox.Button>

                        <AnimatePresence>
                            {open && (
                                <Listbox.Options
                                    as={motion.ul}
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                    static
                                    className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-[#1A1D21]/95 backdrop-blur-xl border border-white/10 py-1.5 shadow-xl shadow-black/40 focus:outline-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                                >
                                    {options.map((option, optionIdx) => (
                                        <Listbox.Option
                                            key={optionIdx}
                                            className={({ active }) =>
                                                cn(
                                                    "relative cursor-pointer select-none py-2.5 pl-10 pr-4 mx-1.5 rounded-lg transition-colors duration-150",
                                                    active ? "bg-primary/10 text-primary" : "text-textMain"
                                                )
                                            }
                                            value={option}
                                        >
                                            {({ selected }) => (
                                                <>
                                                    <span className={cn("block truncate", selected ? "font-semibold" : "font-normal")}>
                                                        {option.label}
                                                    </span>
                                                    {selected ? (
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                                                            <Check size={14} weight="bold" />
                                                        </span>
                                                    ) : null}
                                                </>
                                            )}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </Listbox>
        </div>
    );
};

export default Select;
